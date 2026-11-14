import assert from "node:assert/strict";
import test from "node:test";
import { Readable } from "node:stream";
import { S3Client } from "@aws-sdk/client-s3";
import type * as Storage from "../../utils/r2";

test("object reads enforce the upload cap before retaining oversized bodies", async t => {
  const keys = ["R2_ENDPOINT", "R2_ACCESS_KEY", "R2_SECRET_KEY"] as const;
  const original = keys.map(key => process.env[key]);
  process.env.R2_ENDPOINT = "http://127.0.0.1:1";
  process.env.R2_ACCESS_KEY = "upload-test";
  process.env.R2_SECRET_KEY = "upload-test";
  const storage: typeof Storage = require("../../utils/r2");
  try {
    await t.test("rejects a declared oversized response without reading it", async child => {
      let reads = 0;
      const body = Readable.from((async function* () { reads++; yield Buffer.from("unused"); })());
      // The SDK overload covers every S3 command; this fixture only serves GetObject.
      const send = (async () => ({ Body: body, ContentLength: 50 * 1024 * 1024 + 1 })) as unknown as S3Client["send"];
      child.mock.method(S3Client.prototype, "send", send);
      assert.equal(await storage.getObjectBytes("event/photo.jpg"), null);
      assert.equal(reads, 0);
      assert.equal(body.destroyed, true);
    });
    await t.test("stops streaming at the cap when Content-Length is missing", async child => {
      let produced = 0;
      const chunk = Buffer.alloc(1024 * 1024);
      const body = Readable.from((async function* () {
        for (let i = 0; i < 100; i++) { produced++; yield chunk; }
      })());
      // The SDK overload covers every S3 command; this fixture only serves GetObject.
      const send = (async () => ({ Body: body })) as unknown as S3Client["send"];
      child.mock.method(S3Client.prototype, "send", send);
      assert.equal(await storage.getObjectBytes("event/photo.jpg"), null);
      assert.ok(produced <= 52, `must stop near the 50MB cap, consumed ${produced}MB`);
      assert.equal(body.destroyed, true);
    });
    await t.test("returns bounded valid bytes unchanged", async child => {
      const body = Readable.from([Buffer.from("first"), Buffer.from("second")]);
      // The SDK overload covers every S3 command; this fixture only serves GetObject.
      const send = (async () => ({ Body: body, ContentLength: 11 })) as unknown as S3Client["send"];
      child.mock.method(S3Client.prototype, "send", send);
      assert.deepEqual(await storage.getObjectBytes("event/photo.jpg"), Buffer.from("firstsecond"));
      assert.equal(body.destroyed, true);
    });
  } finally {
    keys.forEach((key, index) => {
      const value = original[index];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    });
  }
});
