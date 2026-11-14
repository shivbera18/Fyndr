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
import { enqueue, retryFailed } from "../../queue/mongoQueue";
import { processUploadedFile } from "../processUpload";
import { httpClient } from "../../utils/http";
import * as r2 from "../../utils/r2";
import * as queue from "../../queue/mongoQueue";
import { pollOnce } from "../ingestWorker";
import * as drive from "../../utils/driveStore";

// These model mocks expose only the operations each test observes, not Mongoose's query overloads.
const photoModel = Photo as unknown as Record<"findOne" | "deleteOne", (...args: unknown[]) => unknown>;
const photoPrototype = Photo.prototype as unknown as { save: () => Promise<void> };
const jobs = Job as unknown as Record<"create" | "findOneAndUpdate" | "updateOne" | "updateMany", (...args: unknown[]) => unknown>;
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
    { $set: { status: "queued", attempts: 0, lastError: null } },
    { $set: { status: "queued", attempts: 0, lastError: null } },
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
    { $set: { status: "queued", attempts: 0, lastError: null, photo_name: "new.jpg" } },
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
    await processUploadedFile({ path: filePath, filename, originalname: filename }, { event_id: "event", folder_name: "General" }, { skipQueue: true });
    assert.equal(await fs.readFile(filePath, "utf8"), "photo");
    configured.mock.mockImplementation(() => false);
    await processUploadedFile({ path: filePath, filename, originalname: filename }, { event_id: "event", folder_name: "General" }, { skipQueue: true });
    assert.equal(await fs.readFile(filePath, "utf8"), "photo");
  } finally {
    httpClient.defaults.adapter = originalAdapter;
    await fs.unlink(filePath).catch(() => {});
  }
});

test("worker rejects a claimed hash mismatch before ML and frees the stub for retry", async t => {
  const filename = `upload-safety-${crypto.randomBytes(8).toString("hex")}.jpg`;
  const filePath = path.join(UPLOAD_DIR, filename);
  const hash = "0".repeat(64);
  let claimed = false;
  t.mock.method(claims, "claimNext", async () => {
    if (claimed) return null;
    claimed = true;
    return { event_id: "event", photo_hash: hash, createdAt: new Date() };
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
    assert.equal(removed.mock.callCount(), 1);
    assert.deepEqual(failed.mock.calls[0].arguments, [
      { event_id: "event", photo_hash: hash },
      { $set: { status: "failed", lastError: "uploaded bytes do not match claimed sha256" } },
    ]);
    await assert.rejects(fs.stat(filePath), { code: "ENOENT" });
  } finally {
    await fs.unlink(filePath).catch(() => {});
  }
});

test("released incomplete uploads yield to untouched jobs", async t => {
  const update = t.mock.method(jobs, "findOneAndUpdate", async () => null);
  await queue.claimNext();
  assert.deepEqual(update.mock.calls[0].arguments[2], { sort: { updatedAt: 1, createdAt: 1 }, new: true });
});
