import assert from "node:assert";
import test from "node:test";
import { FLAGS, isFeatureEnabled } from "../featureFlags";

test("featureFlags", async (t) => {
  await t.test("returns defaultEnabled when env is unset", () => {
    const prev = process.env.FEATURE_REEL;
    delete process.env.FEATURE_REEL;
    try {
      assert.strictEqual(isFeatureEnabled("reel"), FLAGS.reel.defaultEnabled);
      assert.strictEqual(isFeatureEnabled("reel"), false);
    } finally {
      if (prev === undefined) delete process.env.FEATURE_REEL;
      else process.env.FEATURE_REEL = prev;
    }
  });

  await t.test("strict === true semantics", () => {
    const cases: Array<[string, boolean]> = [
      ["true", true],
      ["false", false],
      ["True", false],
      ["TRUE", false],
      ["1", false],
      ["", false],
      [" true", false],
    ];
    const prev = process.env.FEATURE_REEL;
    try {
      for (const [value, expected] of cases) {
        process.env.FEATURE_REEL = value;
        assert.strictEqual(isFeatureEnabled("reel"), expected, `value=${JSON.stringify(value)}`);
      }
      // explicit "false" must disable even if defaultEnabled were true — contract check
      process.env.FEATURE_REEL = "false";
      assert.strictEqual(isFeatureEnabled("reel"), false);
    } finally {
      if (prev === undefined) delete process.env.FEATURE_REEL;
      else process.env.FEATURE_REEL = prev;
    }
  });

  await t.test("reads process.env fresh on every call (no caching)", () => {
    const prev = process.env.FEATURE_REEL;
    try {
      process.env.FEATURE_REEL = "true";
      assert.strictEqual(isFeatureEnabled("reel"), true);
      process.env.FEATURE_REEL = "false";
      assert.strictEqual(isFeatureEnabled("reel"), false);
      delete process.env.FEATURE_REEL;
      assert.strictEqual(isFeatureEnabled("reel"), FLAGS.reel.defaultEnabled);
    } finally {
      if (prev === undefined) delete process.env.FEATURE_REEL;
      else process.env.FEATURE_REEL = prev;
    }
  });

  await t.test("FlagDef shape", () => {
    assert.strictEqual(FLAGS.reel.envKey, "FEATURE_REEL");
    assert.strictEqual(FLAGS.reel.id, "reel");
  });
});
