const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const babel = require("@babel/core");
const rider = fs.existsSync("src/services/auth.service.js");
function load(file, mocks) {
  const exports = {};
  const code = babel.transformSync(fs.readFileSync(file, "utf8"), {
    filename: file, babelrc: false, configFile: false,
    plugins: [require.resolve("@babel/plugin-transform-modules-commonjs")],
  }).code;
  vm.runInNewContext(code, {
    exports, require: (name) => { if (!(name in mocks)) throw Error("Unexpected import " + name); return mocks[name]; },
    process: { env: {} }, console: { log() {} }, __DEV__: false, URL, Map, Date, Math,
  }, { filename: file });
  return exports;
}
function fixture() {
  const calls = [], storage = new Map();
  const api = { defaults: { baseURL: "https://example.com" },
    get: async (...args) => { calls.push(["GET", ...args]); return { data: { userId: 3 } }; },
    post: async (...args) => { calls.push(["POST", ...args]); return { data: { token: "verified-jwt", userId: 3 } }; },
  };
  const auth = { getAuthToken: async () => "signed-in-jwt", setAuthToken: async () => {}, clearAuthToken: async () => {} };
  const asyncStorage = { getItem: async (key) => storage.get(key) || null, setItem: async (key, value) => storage.set(key, value), removeItem: async (key) => storage.delete(key) };
  const mocks = { "./client": api, "../services/authToken": auth, "./api": api, axios: api,
    "../utils/authToken": auth, "@react-native-async-storage/async-storage": asyncStorage,
    "./liveLocation.service": {}, "./notifications": {} };
  return { calls, api, mocks };
}
test("email OTP and resend use POST bodies, never OTP query strings", async () => {
  const f = fixture();
  const module = load(rider ? "src/services/auth.service.js" : "src/api/auth.api.js", f.mocks);
  await (rider ? module.confirmEmailToken : module.confirmTokenApi)("alice@example.com", "123456");
  await (rider ? module.verifyEmail : module.verifyEmailApi)("alice@example.com");
  assert.equal(f.calls[0][0], "POST");
  assert.ok(f.calls[0][1].endsWith("/register/confirmToken"));
  assert.deepEqual(JSON.parse(JSON.stringify(f.calls[0][2])), { email: "alice@example.com", otp: "123456" });
  assert.ok(!f.calls[0][1].includes("123456"));
  assert.equal(f.calls[1][0], "POST");
});
test("failed password login never falls back to a token bypass", async () => {
  const f = fixture();
  f.api.post = async () => { throw { response: { status: 403 } }; };
  const module = load(rider ? "src/services/auth.service.js" : "src/api/auth.api.js", f.mocks);
  await assert.rejects(async () => rider ? module.loginWithCurrentBackend("alice", "wrong") : module.loginApi({ username: "alice", password: "wrong" }));
  assert.equal(f.calls.length, 0);
});
if (!rider) test("network retry reuses booking key and concurrent taps share the request", async () => {
  const f = fixture();
  let fail = true;
  f.api.post = async (...args) => {
    f.calls.push(["POST", ...args]);
    if (fail) { fail = false; throw Error("Network timeout"); }
    return { data: "Ride Request Sent, id=42" };
  };
  const module = load("src/api/ride.api.js", f.mocks);
  const input = { pickUpLatitude: 19, pickUpLongitude: 72, dropLatitude: 20, dropLongitude: 73, fare: 361, chassisNo: "bike-id", vehicleName: "Bike" };
  await assert.rejects(() => module.createRideApi(input));
  const firstKey = f.calls.find((c) => c[0] === "POST")[3].headers["Idempotency-Key"];
  const first = module.createRideApi(input), second = module.createRideApi(input);
  assert.equal(first, second);
  await first;
  const posts = f.calls.filter((c) => c[0] === "POST");
  assert.equal(posts.length, 2);
  assert.equal(posts[1][3].headers["Idempotency-Key"], firstKey);
});
if (!rider) test("server paise/meters quote is displayed in rupees/km", async () => {
  const f = fixture();
  f.api.get = async () => ({ data: { distanceMeters: 19000, amountPaise: 36100, businessPaise: 3610, riderPaise: 32490 } });
  const module = load("src/api/ride.api.js", f.mocks);
  const response = await module.calculateFareApi({ startLatitude: 19, startLongitude: 72, destinationLatitude: 20, destinationLongitude: 73 });
  assert.equal(response.data.fare, 361);
  assert.equal(response.data.distance, 19);
});
