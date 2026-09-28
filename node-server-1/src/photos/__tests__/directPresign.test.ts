import assert from "node:assert";
import test from "node:test";
import * as r2 from "../../utils/r2";

test("Direct Presign contract", async (t) => {
  await t.test("getPresignedPut returns null when endpoint is private and no public endpoint configured", async () => {
    const origEndpoint = process.env.R2_ENDPOINT;
    const origPublic = process.env.R2_PUBLIC_ENDPOINT;
    try {
      process.env.R2_ENDPOINT = "http://127.0.0.1:9000";
      delete process.env.R2_PUBLIC_ENDPOINT;
      const url = await r2.getPresignedPut("test-event/photo.jpg", "image/jpeg");
      assert.strictEqual(url, null, "must return null for loopback endpoint without public origin");
    } finally {
      if (origEndpoint) process.env.R2_ENDPOINT = origEndpoint;
      else delete process.env.R2_ENDPOINT;
      if (origPublic) process.env.R2_PUBLIC_ENDPOINT = origPublic;
      else delete process.env.R2_PUBLIC_ENDPOINT;
    }
  });

  await t.test("getPresignedPut produces a valid URL with public endpoint or public origin", async () => {
    const url = await r2.getPresignedPut("test-event/photo.jpg", "image/jpeg");
    if (url) {
      assert.ok(url.startsWith("https://") || url.startsWith("http://"));
      assert.ok(!url.includes("127.0.0.1"), "must never return loopback IP");
      assert.ok(!url.includes("localhost"), "must never return localhost");
      assert.ok(!url.includes("0.0.0.0"), "must never return 0.0.0.0");
    }
  });

  await t.test("getPresignedPut rejects path traversal attempts with '..'", async () => {
    await assert.rejects(
      async () => {
        await r2.getPresignedPut("event/../../etc/passwd", "image/jpeg");
      },
      { message: "invalid key" }
    );
  });

  await t.test("getPresignedPut rejects empty or overlong keys", async () => {
    await assert.rejects(
      async () => {
        await r2.getPresignedPut("", "image/jpeg");
      },
      { message: "invalid key" }
    );
    await assert.rejects(
      async () => {
        await r2.getPresignedPut("a".repeat(513), "image/jpeg");
      },
      { message: "invalid key" }
    );
  });
});
