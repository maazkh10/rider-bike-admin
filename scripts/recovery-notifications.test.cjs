const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const babel = require("@babel/core");
const rider = fs.existsSync("src/utils/authToken.js");

test("patched image parser preserves Metro filename and buffer APIs", () => {
  const imageSize = require("image-size");
  const file = require.resolve("expo-router/assets/forward.png");
  const fromFile = imageSize(file), fromBuffer = imageSize(fs.readFileSync(file));
  assert.ok(fromFile.width > 0 && fromFile.height > 0);
  assert.deepEqual(fromFile, fromBuffer);
});
test("patched URI decoder preserves query-string navigation", () => {
  const decode = require("decode-uri-component");
  assert.equal(typeof decode, "function");
  assert.equal(decode("Bike%20%26%20Scooty"), "Bike & Scooty");
  const query = require("query-string");
  const result = query.parse("vehicle=Bike%20%26%20Scooty&city=Mumbai&broken=%E0%A4%A");
  assert.equal(result.vehicle, "Bike & Scooty");
  assert.equal(result.city, "Mumbai");
  assert.equal(typeof result.broken, "string");
  assert.doesNotThrow(() => decode("%".repeat(20000)));
});

function fixture() {
  const calls = [], values = new Map();
  let auth = "account-one", token = "ExponentPushToken[deviceOne12345678]", permission = "granted", project = "project-id";
  const callbacks = {};
  const notifications = {
    setNotificationHandler: handler => { callbacks.handler = handler.handleNotification; },
    addNotificationReceivedListener: fn => { callbacks.received = fn; return { remove() {} }; },
    addNotificationResponseReceivedListener: fn => { callbacks.response = fn; return { remove() {} }; },
    addPushTokenListener: () => ({ remove() {} }),
    getLastNotificationResponseAsync: async () => null,
    AndroidImportance: { HIGH: 4 }, setNotificationChannelAsync: async () => {},
    getPermissionsAsync: async () => ({ status: permission }), requestPermissionsAsync: async () => ({ status: permission }),
    getExpoPushTokenAsync: async () => ({ data: token }),
  };
  const mocks = {
    "@react-native-async-storage/async-storage": { getItem: async key => values.get(key) || null, setItem: async (key, value) => values.set(key, value), removeItem: async key => values.delete(key) },
    "expo-device": { isDevice: true }, "expo-constants": { executionEnvironment: "standalone", expoConfig: { extra: { eas: { get projectId() { return project; } } } } },
    "expo-crypto": { randomUUID: () => "installation_1234567890" },
    "react-native": { Platform: { OS: "ios" }, AppState: { currentState: "active", addEventListener: () => ({ remove() {} }) } },
    [rider ? "../utils/authToken" : "./authToken"]: { getAuthToken: async () => auth },
    "expo-notifications": notifications,
  };
  const source = fs.readFileSync("src/services/pushClient.js", "utf8").replace('import("expo-notifications")', 'Promise.resolve(require("expo-notifications"))');
  const code = babel.transformSync(source, { filename: "pushClient.js", babelrc: false, configFile: false, plugins: [require.resolve("@babel/plugin-transform-modules-commonjs")] }).code;
  const exports = {};
  vm.runInNewContext(code, { exports, require: name => { if (!(name in mocks)) throw Error(name); return mocks[name]; }, process: { env: {} }, setTimeout, clearTimeout, AbortController,
    setInterval: () => 1, clearInterval() {},
    fetch: async (url, input) => { calls.push({ url, ...input }); return { ok: true }; },
  });
  return { client: exports, calls, callbacks, changeToken: next => { token = next; }, changeAuth: next => { auth = next; }, deny: () => { permission = "denied"; }, noProject: () => { project = null; } };
}

test("foreground remote delivery shows an alert without a socket and deduplicates matching event IDs", async () => {
  const f = fixture();
  let opened = 0, updated = 0;
  const unsubscribe = f.client.subscribeRideNotifications(() => { updated++; });
  const cleanup = await f.client.startPushLifecycle(() => { opened++; });
  const event = { request: { identifier: "remote-one", content: { data: { remote: true, type: "RIDE_COMPLETED", rideId: 42, eventId: "event-one" } } } };
  assert.equal((await f.callbacks.handler(event)).shouldShowBanner, true);
  assert.equal((await f.callbacks.handler(event)).shouldShowBanner, false);
  f.callbacks.received(event);
  assert.equal(updated, 1);
  assert.equal(opened, 0, "receiving an alert must not navigate");
  assert.equal(f.client.claimRideNotification(event.request.content.data), false, "socket-local duplicate suppressed");
  f.callbacks.response({ notification: event });
  await new Promise(resolve => setTimeout(resolve, 10));
  assert.equal(opened, 1);
  f.callbacks.response({ notification: event });
  await new Promise(resolve => setTimeout(resolve, 10));
  assert.equal(opened, 1, "duplicate taps do not open a second screen");
  unsubscribe(); cleanup();
});
test("push registration is owned by login, deduplicates concurrent registration, and handles rotation", async () => {
  const f = fixture();
  await Promise.all([f.client.syncPushDevice(), f.client.syncPushDevice()]);
  assert.equal(f.calls.length, 1);
  const body = JSON.parse(f.calls[0].body);
  assert.equal(body.app, rider ? "rider" : "admin");
  assert.equal(body.installationId, "installation_1234567890");
  assert.equal(f.calls[0].headers.Authorization, "Bearer account-one");
  f.changeToken("ExponentPushToken[deviceTwo12345678]");
  await f.client.syncPushDevice();
  assert.equal(f.calls.length, 2);
  assert.equal(JSON.parse(f.calls[1].body).token, "ExponentPushToken[deviceTwo12345678]");
});
test("logout unregisters the old account and pauses background registration", async () => {
  const f = fixture(); await f.client.syncPushDevice();
  await f.client.unregisterPushDevice(); await f.client.syncPushDevice();
  assert.equal(f.calls.length, 2);
  assert.equal(f.calls[1].method, "DELETE");
  assert.equal(f.calls[1].headers.Authorization, "Bearer account-one");
  f.changeAuth("account-two"); f.client.resumeDeviceRegistration(); await f.client.syncPushDevice();
  assert.equal(f.calls[2].headers.Authorization, "Bearer account-two");
});
test("missing push credentials or denied permission never block the app", async () => {
  const denied = fixture(); denied.deny(); assert.equal(await denied.client.syncPushDevice(), null); assert.equal(denied.calls.length, 0);
  const missing = fixture(); missing.noProject(); assert.equal(await missing.client.syncPushDevice(), null); assert.equal(missing.calls.length, 0);
});
