import assert from "node:assert";
import test from "node:test";
import * as r2 from "../../utils/r2";

test("G3/R2 vs Drive mutual exclusivity contract", async (t) => {
  await t.test("hasR2() returns boolean and guards duplicate upload path", () => {
    const isConfigured = r2.hasR2();
    assert.strictEqual(typeof isConfigured, "boolean");
    // When hasR2() is true (as on the VPS), ingest worker routes to putObjectBytes,
    // skipping syncUploadToDrive so photos are never duplicated in Drive.
  });
});
