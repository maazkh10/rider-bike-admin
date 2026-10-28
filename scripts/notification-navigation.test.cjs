const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs"), vm = require("node:vm"), babel = require("@babel/core");
function moduleFrom(path) {
  const exports = {};
  const code = babel.transformSync(fs.readFileSync(path, "utf8"), { babelrc: false, configFile: false, plugins: [require.resolve("@babel/plugin-transform-modules-commonjs")] }).code;
  vm.runInNewContext(code, { exports }); return exports;
}
const { resolveMonitoredRide, isCurrentRideMonitor } = moduleFrom("src/services/rideMonitorState.js");
test("completed ride survives removal from active-ride and a newer active booking", async () => {
  const completed = { rideId: 42, rideStatus: "COMPLETED" };
  for (const active of [null, { rideId: 99, rideStatus: "ACCEPTED" }])
    assert.equal(await resolveMonitoredRide(42, active, async () => [completed]), completed);
});
test("same-ride push tap keeps the existing monitor rather than adding/replacing a screen", () => {
  assert.equal(isCurrentRideMonitor("/ride-monitor", { rideId: "42" }, 42), true);
  assert.equal(isCurrentRideMonitor("/ride-monitor", { rideId: "99" }, 42), false);
  assert.equal(isCurrentRideMonitor("/(tabs)/home", {}, 42), false);
});
test("completion event handling contains no dashboard redirect or screen replacement", () => {
  const source = fs.readFileSync("app/ride-monitor.jsx", "utf8");
  const start = source.indexOf('else if (type === "RIDE_COMPLETED")');
  const end = source.indexOf('else if (type === "RIDE_CANCELLED"', start);
  assert.ok(start > 0 && end > start);
  assert.ok(!/router\.(push|replace|back)/.test(source.slice(start, end)));
});
