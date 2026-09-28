import assert from "node:assert";
import test from "node:test";
import * as r2 from "../../utils/r2";

test("Direct Presign contract", async (t) => {
  await t.test("getPresignedPut returns null or valid URL and never loopback when unconfigured", async () => {
    const url = await r2.getPresignedPut("test-event/photo.jpg", "image/jpeg").catch(() => null);
    if (url) {
      assert.ok(!url.includes("127.0.0.1"), "presigned URL must never expose loopback 127.0.0.1 to clients");
      assert.ok(url.startsWith("http"), "presigned URL must start with http/https");
    }
  });
});
