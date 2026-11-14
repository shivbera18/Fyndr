import assert from "node:assert/strict";
import test from "node:test";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import http from "node:http";
import type { AddressInfo } from "node:net";
import path from "node:path";
import { setImmediate as yieldToIO } from "node:timers/promises";
import express from "express";
import FormData from "form-data";
import { UPLOAD_DIR } from "../../config";
import { upload } from "../../middleware/upload";
import photos from "../../routes/photos";
import Photo from "../../models/Photo";
import Job from "../../models/Job";
import Event from "../../models/Event";
import { enqueue, retryFailed } from "../../queue/mongoQueue";
import { processUploadedFile } from "../processUpload";
import { httpClient } from "../../utils/http";
import * as r2 from "../../utils/r2";
import * as queue from "../../queue/mongoQueue";
import { pollOnce } from "../ingestWorker";
import * as drive from "../../utils/driveStore";

// These model mocks expose only the operations each test observes, not Mongoose's query overloads.
const photoModel = Photo as unknown as Record<"findOne" | "findOneAndDelete" | "updateOne" | "deleteOne", (...args: unknown[]) => unknown>;
const photoPrototype = Photo.prototype as unknown as { save: () => Promise<void> };
const jobs = Job as unknown as Record<"create" | "findOne" | "findOneAndUpdate" | "updateOne" | "updateMany" | "deleteOne", (...args: unknown[]) => unknown>;
const claims = queue as unknown as { claimNext: () => Promise<unknown> };

async function eventually(check: () => Promise<boolean>): Promise<void> {
  for (let i = 0; i < 1000; i++) {
    if (await check()) return;
    await yieldToIO();
  }
  assert.fail("upload filesystem state did not settle");
}

test("multipart cleanup covers rejected metadata and interrupted requests", async t => {
  const app = express();
  app.post("/raw", upload.array("name", 100), (_req, res) => res.sendStatus(204));
  app.use(photos);
  app.use((_error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    res.status(400).end();
  });
  const server = http.createServer(app);
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const port = (server.address() as AddressInfo).port;
  const suffix = `upload-safety-${crypto.randomBytes(8).toString("hex")}.jpg`;
  const remaining = async () => (await fs.readdir(UPLOAD_DIR)).filter(name => name.endsWith(suffix));
  const boundary = "upload-safety-boundary";
  const header = `--${boundary}\r\nContent-Disposition: form-data; name="name"; filename="${suffix}"\r\nContent-Type: image/jpeg\r\n\r\n`;
  try {
    await t.test("invalid event metadata removes the already received file", async () => {
      const body = Buffer.from(`${header}photo\r\n--${boundary}--\r\n`);
      const status = await new Promise<number | undefined>((resolve, reject) => {
        const req = http.request({ host: "127.0.0.1", port, path: "/photo", method: "POST", headers: {
          "Content-Type": `multipart/form-data; boundary=${boundary}`, "Content-Length": body.length,
        } }, res => { res.resume(); res.once("end", () => resolve(res.statusCode)); });
        req.once("error", reject);
        req.end(body);
      });
      assert.equal(status, 400);
      await eventually(async () => (await remaining()).length === 0);
    });
    await t.test("disconnect removes both completed and active multipart files", async () => {
      const req = http.request({ host: "127.0.0.1", port, path: "/raw", method: "POST", headers: {
        "Content-Type": `multipart/form-data; boundary=${boundary}`,
      } });
      req.on("error", () => {}); // Deliberate client cancellation.
      try {
        req.write(`${header}first\r\n${header}second`);
        await eventually(async () => (await remaining()).length === 2);
      } finally {
        req.destroy();
      }
      await eventually(async () => (await remaining()).length === 0);
    });
  } finally {
    server.closeAllConnections();
    await new Promise<void>(resolve => server.close(() => resolve()));
    for (const name of await remaining()) await fs.unlink(path.join(UPLOAD_DIR, name));
  }
});

test("explicit retries reset the exhausted claim budget", async t => {
  const updates: unknown[] = [];
  t.mock.method(jobs, "updateOne", (_filter: unknown, update: unknown) => { updates.push(update); });
  t.mock.method(jobs, "updateMany", (_filter: unknown, update: unknown) => { updates.push(update); });
  await retryFailed("event", "hash");
  await retryFailed("event");
  assert.deepEqual(updates, [
    { $set: { status: "queued", attempts: 0, lastError: null, lease: null } },
    { $set: { status: "queued", attempts: 0, lastError: null, lease: null } },
  ]);
});

test("a re-upload revives only a failed deduplicated job", async t => {
  const duplicate = Object.assign(new Error("duplicate"), { code: 11000 });
  t.mock.method(jobs, "create", async () => { throw duplicate; });
  const revived = { status: "queued", attempts: 0 };
  const update = t.mock.method(jobs, "findOneAndUpdate", async () => revived);
  assert.equal(await enqueue("event", "hash", "new.jpg"), revived);
  assert.deepEqual(update.mock.calls[0].arguments, [
    { event_id: "event", photo_hash: "hash", status: "failed" },
    { $set: { status: "queued", attempts: 0, lastError: null, lease: null, photo_name: "new.jpg" } },
    { new: true },
  ]);
});

test("FTP ingestion retains the sole original when mirrors do not confirm storage", async t => {
  const filename = `upload-safety-${crypto.randomBytes(8).toString("hex")}.jpg`;
  const filePath = path.join(UPLOAD_DIR, filename);
  t.mock.method(photoModel, "findOne", () => ({ select: async () => null, then: (resolve: (value: null) => void) => resolve(null) }));
  t.mock.method(photoPrototype, "save", async () => {});
  const originalAdapter = httpClient.defaults.adapter;
  httpClient.defaults.adapter = async config => {
    const body: unknown = config.data;
    if (body instanceof FormData) {
      await new Promise<void>((resolve, reject) => {
        body.once("end", resolve);
        body.once("error", reject);
        body.resume();
      });
    }
    return { data: { embeddings: [] }, status: 200, statusText: "OK", headers: {}, config };
  };
  const configured = t.mock.method(r2, "hasR2", () => true);
  t.mock.method(r2, "putObjectBytes", async () => false);
  t.mock.method(drive, "syncUploadToDrive", async () => {});
  try {
    await fs.writeFile(filePath, "photo");
    await processUploadedFile({ path: filePath, filename, originalname: filename }, { event_id: "event", folder_name: "General" });
    assert.equal(await fs.readFile(filePath, "utf8"), "photo");
    configured.mock.mockImplementation(() => false);
    await processUploadedFile({ path: filePath, filename, originalname: filename }, { event_id: "event", folder_name: "General" });
    assert.equal(await fs.readFile(filePath, "utf8"), "photo");
  } finally {
    httpClient.defaults.adapter = originalAdapter;
    await fs.unlink(filePath).catch(() => {});
  }
});

test("worker rejects a claimed hash mismatch before ML and retains its retry source", async t => {
  const filename = `upload-safety-${crypto.randomBytes(8).toString("hex")}.jpg`;
  const filePath = path.join(UPLOAD_DIR, filename);
  const hash = "0".repeat(64);
  let claimed = false;
  t.mock.method(claims, "claimNext", async () => {
    if (claimed) return null;
    claimed = true;
    return { event_id: "event", photo_hash: hash, createdAt: new Date(), lease: "claim" };
  });
  t.mock.method(photoModel, "findOne", async () => ({ _id: "photo", name: filename, folder_name: "General" }));
  const removed = t.mock.method(photoModel, "deleteOne", async () => ({}));
  const failed = t.mock.method(jobs, "updateOne", async () => ({}));
  t.mock.method(r2, "deleteObject", async () => {});
  const ml = t.mock.method(httpClient, "post", async () => { throw new Error("must not call ML"); });
  try {
    await fs.writeFile(filePath, "different bytes");
    await pollOnce();
    assert.equal(ml.mock.callCount(), 0);
    assert.equal(removed.mock.callCount(), 0);
    assert.deepEqual(failed.mock.calls[0].arguments, [
      { event_id: "event", photo_hash: hash, status: "processing", lease: "claim" },
      { $set: { status: "failed", lastError: "uploaded bytes do not match claimed sha256", lease: null } },
    ]);
    assert.equal(await fs.readFile(filePath, "utf8"), "different bytes");
  } finally {
    await fs.unlink(filePath).catch(() => {});
  }
});

test("released incomplete uploads yield to untouched jobs", async t => {
  const update = t.mock.method(jobs, "findOneAndUpdate", async () => null);
  await queue.claimNext();
  assert.deepEqual(update.mock.calls[0].arguments[2], { sort: { updatedAt: 1, createdAt: 1 }, new: true });
});

test("direct and multipart retries survive an older worker's terminal failure", async t => {
  for (const via of ["direct", "multipart"] as const) {
    for (const publication of ["before", "after"] as const) {
      await t.test(`${via}: retry ${publication} failed-state publication`, async t => {
        const eventId = "0123456789abcdef01234567";
        const photoId = "abcdef0123456789abcdef01";
        const filename = `upload-race-${crypto.randomBytes(8).toString("hex")}.jpg`;
        const valid = Buffer.from("valid replacement photo");
        const hash = crypto.createHash("sha256").update(valid).digest("hex");
        const photo: Record<string, unknown> = {
          _id: photoId, event_id: eventId, name: filename, hash, status: "queued", folder_name: "General",
        };
        const job: Record<string, unknown> = {
          event_id: eventId, photo_hash: hash, status: "queued", attempts: 2, createdAt: new Date(0),
        };
        const matches = (row: Record<string, unknown>, filter: Record<string, unknown>) =>
          Object.entries(filter).every(([key, value]) => typeof value === "object" && value !== null && "$ne" in value
            ? row[key] !== value.$ne : row[key] === value);
        let release!: () => void;
        let reached!: () => void;
        const blocked = new Promise<void>(resolve => { reached = resolve; });
        const resumed = new Promise<void>(resolve => { release = resolve; });
        let releaseComplete!: () => void;
        let reachedComplete!: () => void;
        const completeBlocked = new Promise<void>(resolve => { reachedComplete = resolve; });
        const completeResumed = new Promise<void>(resolve => { releaseComplete = resolve; });
        let paused = false;
        let available = true;
        let nextLease = 0;
        let remote = Buffer.from("invalid old remote bytes");
        t.mock.method(claims, "claimNext", async () => {
          if (!available || job.status !== "queued") return null;
          available = false;
          Object.assign(job, { status: "processing", lease: `lease-${++nextLease}`, attempts: Number(job.attempts) + 1 });
          return { ...job };
        });
        t.mock.method(jobs, "findOne", async (filter: Record<string, unknown>) => matches(job, filter) ? { ...job } : null);
        t.mock.method(jobs, "updateOne", async (filter: Record<string, unknown>, update: { $set: Record<string, unknown> } | Array<{ $set: Record<string, unknown> }>) => {
          const fields = { ...(Array.isArray(update) ? update[0].$set : update.$set) };
          if (Array.isArray(update)) {
            assert.deepEqual(fields.source, { $cond: [
              { $and: [{ $eq: ["$source", "local"] }, { $eq: ["$photo_name", filename] }] },
              "local", "remote",
            ] });
            fields.source = job.source === "local" && job.photo_name === fields.photo_name ? "local" : "remote";
          }
          const terminal = fields.status === "failed" && !paused;
          if (terminal) {
            paused = true;
            if (publication === "before") { reached(); await resumed; }
          }
          const matchedCount = matches(job, filter) ? 1 : 0;
          if (matchedCount) Object.assign(job, fields);
          if (terminal && publication === "after") { reached(); await resumed; }
          return { matchedCount };
        });
        t.mock.method(photoModel, "findOne", async (filter: Record<string, unknown>) => matches(photo, filter) ? { ...photo } : null);
        t.mock.method(photoModel, "updateOne", async (filter: Record<string, unknown>, update: Record<string, unknown>) => {
          const matchedCount = matches(photo, filter) ? 1 : 0;
          if (matchedCount) Object.assign(photo, update);
          return { matchedCount };
        });
        const removed = t.mock.method(photoModel, "deleteOne", async () => { throw new Error("must retain acknowledged photo"); });
        const deletedPhoto = t.mock.method(photoModel, "findOneAndDelete", async (filter: Record<string, unknown>) => {
          assert.equal(String(filter._id), photoId);
          return { ...photo };
        });
        const deletedJob = t.mock.method(jobs, "deleteOne", async () => ({}));
        t.mock.method(drive, "syncDeletePhotoFromDrive", async () => {});
        t.mock.method(Event, "findById", () => ({ select: async () => ({ folders: [] }) }));
        t.mock.method(r2, "headObject", async () => {
          if (via === "multipart") { reachedComplete(); await completeResumed; }
          return true;
        });
        t.mock.method(r2, "getObjectBytes", async () => remote);
        t.mock.method(r2, "getPresignedPut", async () => "https://store.test/retry");
        const objects = new Set([`${eventId}/${filename}`, r2.g3Key(eventId, "General", filename)]);
        const deletedBytes = t.mock.method(r2, "deleteObject", async (key: string) => { objects.delete(key); });
        t.mock.method(r2, "hasR2", () => true);
        t.mock.method(r2, "putObjectBytes", async () => false);
        const ml = t.mock.method(httpClient, "post", async (url: string) => {
          if (url.endsWith("/faiss_remove")) return { data: {} };
          if (url.endsWith("/thumbnail")) throw new Error("no thumbnail");
          assert.ok(url.endsWith("/get_embeddings"));
          return { data: { results: [{ embeddings: [] }] } };
        });
        const app = express();
        app.use(express.json());
        app.use(photos);
        const server = http.createServer(app);
        await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
        const port = (server.address() as AddressInfo).port;
        const request = (route: string, body: Buffer, headers: http.OutgoingHttpHeaders, method = "POST") =>
          new Promise<{ status: number | undefined; body: Record<string, unknown> }>((resolve, reject) => {
            const req = http.request({ host: "127.0.0.1", port, path: route, method, headers }, res => {
              const chunks: Buffer[] = [];
              res.on("data", (chunk: Buffer) => chunks.push(chunk));
              res.on("end", () => resolve({ status: res.statusCode, body: JSON.parse(Buffer.concat(chunks).toString()) }));
            });
            req.on("error", reject);
            req.end(body);
          });
        const json = (route: string, body: unknown) => request(route, Buffer.from(JSON.stringify(body)), { "Content-Type": "application/json" });
        let worker: Promise<void> | undefined;
        try {
          await fs.writeFile(path.join(UPLOAD_DIR, filename), "invalid original bytes");
          worker = pollOnce();
          await blocked;
          if (via === "direct") {
            const stage = await json("/photo/stage", {
              event_id: eventId, hash, filename, size: valid.length, contentType: "image/jpeg",
            });
            assert.equal(stage.status, 200);
            assert.equal(stage.body.duplicate, undefined, "corrupt existing bytes must not deduplicate");
            assert.equal(stage.body.uploadUrl, "https://store.test/retry");
            remote = valid; // Browser PUT lands between the actual stage/complete requests.
            const complete = await json("/photo/complete", { event_id: eventId, photo_id: photoId });
            assert.equal(complete.status, 200);
            assert.equal(complete.body.ok, true);
          } else {
            // A different API process read the photo before multipart adopted
            // valid bytes; its late completion must preserve local ownership.
            const staleComplete = json("/photo/complete", { event_id: eventId, photo_id: photoId });
            await completeBlocked;
            const form = new FormData();
            form.append("event_id", eventId);
            form.append("name", valid, { filename, contentType: "image/jpeg" });
            const upload = await request("/photo", form.getBuffer(), form.getHeaders());
            assert.equal(upload.status, 202);
            assert.equal(photo.name, filename, "adoption must keep the original resource key");
            assert.deepEqual((await fs.readdir(UPLOAD_DIR)).filter(name => name.endsWith(filename)), [filename]);
            releaseComplete();
            assert.equal((await staleComplete).body.ok, true);
            assert.equal(job.photo_name, filename);
            assert.equal(job.source, "local", "stale direct completion must not replace validated local ownership");
          }
          assert.equal(job.status, "queued");
          assert.equal(job.lease, null);
          release();
          await worker;
          assert.equal(job.status, "queued", "stale failure must not overwrite the new attempt");
          assert.equal(removed.mock.callCount(), 0);
          assert.equal(deletedBytes.mock.callCount(), 0);
          assert.equal(ml.mock.callCount(), 0, "invalid old bytes must never reach ML");
          if (via === "multipart") assert.deepEqual(await fs.readFile(path.join(UPLOAD_DIR, String(photo.name))), valid);
          else assert.deepEqual(remote, valid);
          available = true;
          await pollOnce();
          assert.equal(photo.status, "done");
          assert.equal(job.status, "done");
          assert.equal(ml.mock.calls.filter(call => String(call.arguments[0]).endsWith("/get_embeddings")).length, 1);
          // Success retains only resources still named by the Photo. Explicit
          // deletion must remove the original and both remote siblings, not
          // rely on teardown to hide abandoned upload generations.
          assert.equal(photo.name, filename);
          assert.equal(job.photo_name, filename);
          assert.deepEqual((await fs.readdir(UPLOAD_DIR)).filter(name => name.endsWith(filename)), [filename]);
          const deletion = await request("/delete-image", Buffer.from(JSON.stringify({ _id: photoId })), { "Content-Type": "application/json" }, "DELETE");
          assert.equal(deletion.status, 200);
          assert.equal(deletion.body.success, true);
          await eventually(async () => objects.size === 0 && !(await fs.readdir(UPLOAD_DIR)).some(name => name.endsWith(filename)));
          assert.equal(deletedPhoto.mock.callCount(), 1);
          assert.equal(deletedJob.mock.callCount(), 1);
          assert.equal(deletedBytes.mock.callCount(), 2);
        } finally {
          release();
          releaseComplete();
          await worker;
          server.closeAllConnections();
          await new Promise<void>(resolve => server.close(() => resolve()));
          await fs.unlink(path.join(UPLOAD_DIR, filename)).catch(() => {});
        }
      });
    }
  }
});
