import test from "node:test";
import assert from "node:assert/strict";
import {
  BLOCKED_AUTH_MESSAGE,
  consumeBlockedAuthNotice,
  createRealtimeUserAccessMonitor,
  saveBlockedAuthNotice,
} from "../src/services/realtimeUserAccess.js";

const createHarness = () => {
  let authCallback;
  let authUnsubscribeCount = 0;
  let userUnsubscribeCount = 0;
  let signOutCount = 0;
  const listeners = [];
  const statuses = [];
  const subscribedUids = [];
  const errors = [];
  const navigations = [];

  const stop = createRealtimeUserAccessMonitor({
    observeAuth: (callback) => {
      authCallback = callback;
      return () => {
        authUnsubscribeCount += 1;
      };
    },
    subscribeUser: (uid, onNext, onError) => {
      subscribedUids.push(uid);
      const listener = { onNext, onError, active: true };
      listeners.push(listener);

      return () => {
        if (listener.active) {
          listener.active = false;
          userUnsubscribeCount += 1;
        }
      };
    },
    signOutUser: () => {
      signOutCount += 1;
    },
    onAccessChange: (status) => statuses.push(status),
    onBlocked: () => navigations.push("/login"),
    onError: (error) => errors.push(error),
  });

  return {
    emitAuth: (user) => authCallback(user),
    emitDocument: (data, index = listeners.length - 1) =>
      listeners[index].onNext({
        exists: () => data !== null,
        data: () => data,
      }),
    emitError: (error, index = listeners.length - 1) =>
      listeners[index].onError(error),
    stop,
    listeners,
    statuses,
    subscribedUids,
    errors,
    navigations,
    counts: () => ({
      authUnsubscribeCount,
      userUnsubscribeCount,
      signOutCount,
    }),
  };
};

test("un usuario activo continúa conectado", () => {
  const harness = createHarness();
  harness.emitAuth({ uid: "patient-1" });
  harness.emitDocument({ blocked: false });

  assert.deepEqual(harness.statuses, ["checking", "allowed"]);
  assert.equal(harness.counts().signOutCount, 0);
  assert.deepEqual(harness.subscribedUids, ["patient-1"]);
  harness.stop();
});

test("un cambio a blocked cierra sesión una sola vez y navega al login", () => {
  const harness = createHarness();
  harness.emitAuth({ uid: "patient-2" });
  harness.emitDocument({ blocked: true });
  harness.emitDocument({ blocked: true });

  assert.equal(harness.counts().signOutCount, 1);
  assert.deepEqual(harness.navigations, ["/login"]);
  assert.equal(harness.statuses.at(-1), "blocked");
  harness.stop();
});

test("el aviso de bloqueo se consume y elimina después de mostrarse", () => {
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };

  saveBlockedAuthNotice(storage);

  assert.equal(consumeBlockedAuthNotice(storage), BLOCKED_AUTH_MESSAGE);
  assert.equal(consumeBlockedAuthNotice(storage), null);
});

test("el listener se desuscribe al cerrar sesión", () => {
  const harness = createHarness();
  harness.emitAuth({ uid: "patient-3" });
  harness.emitAuth(null);

  assert.equal(harness.counts().userUnsubscribeCount, 1);
  assert.equal(harness.statuses.at(-1), "signed-out");
  harness.stop();
});

test("todos los listeners se desuscriben al desmontarse", () => {
  const harness = createHarness();
  harness.emitAuth({ uid: "patient-4" });
  harness.stop();

  assert.deepEqual(harness.counts(), {
    authUnsubscribeCount: 1,
    userUnsubscribeCount: 1,
    signOutCount: 0,
  });
});

test("no crea listeners duplicados para el mismo usuario", () => {
  const harness = createHarness();
  const user = { uid: "patient-5" };
  harness.emitAuth(user);
  harness.emitAuth(user);

  assert.equal(harness.listeners.length, 1);
  harness.stop();
});

test("un error de red no se interpreta como bloqueo", () => {
  const harness = createHarness();
  const networkError = new Error("network unavailable");
  harness.emitAuth({ uid: "patient-6" });
  harness.emitError(networkError);

  assert.equal(harness.counts().signOutCount, 0);
  assert.equal(harness.statuses.at(-1), "allowed");
  assert.deepEqual(harness.errors, [networkError]);
  harness.stop();
});

test("un usuario desbloqueado posteriormente puede iniciar sesión", () => {
  const harness = createHarness();
  harness.emitAuth({ uid: "patient-7" });
  harness.emitDocument({ blocked: true });
  harness.emitAuth(null);
  harness.emitAuth({ uid: "patient-7" });
  harness.emitDocument({ blocked: false });

  assert.equal(harness.counts().signOutCount, 1);
  assert.equal(harness.statuses.at(-1), "allowed");
  harness.stop();
});

test("un bloqueo mientras el usuario está en chat provoca expulsión", () => {
  const harness = createHarness();
  let currentRoute = "/chat";
  harness.navigations.push = (route) => {
    currentRoute = route;
    return 1;
  };

  harness.emitAuth({ uid: "patient-chat" });
  harness.emitDocument({ blocked: false });
  harness.emitDocument({ blocked: true });

  assert.equal(currentRoute, "/login");
  assert.equal(harness.counts().signOutCount, 1);
  harness.stop();
});

test("un usuario ya bloqueado no alcanza el estado allowed al iniciar", () => {
  const harness = createHarness();
  harness.emitAuth({ uid: "patient-blocked" });
  harness.emitDocument({ blocked: true });

  assert.deepEqual(harness.statuses, ["checking", "blocked"]);
  assert.deepEqual(harness.navigations, ["/login"]);
  harness.stop();
});

test("el administrador observa solo su propio documento", () => {
  const harness = createHarness();
  harness.emitAuth({ uid: "admin-1" });
  harness.emitDocument({ role: "admin", blocked: false });

  assert.deepEqual(harness.subscribedUids, ["admin-1"]);
  assert.equal(harness.counts().signOutCount, 0);
  harness.stop();
});

test("el login normal conserva acceso y usa el uid de Firebase Auth", () => {
  const harness = createHarness();
  harness.emitAuth({ uid: "firebase-auth-uid" });
  harness.emitDocument({ role: "patient" });

  assert.deepEqual(harness.subscribedUids, ["firebase-auth-uid"]);
  assert.equal(harness.statuses.at(-1), "allowed");
  assert.equal(harness.counts().signOutCount, 0);
  harness.stop();
});

test("un documento inexistente conserva el acceso actual", () => {
  const harness = createHarness();
  harness.emitAuth({ uid: "missing-document" });
  harness.emitDocument(null);

  assert.equal(harness.statuses.at(-1), "allowed");
  assert.equal(harness.counts().signOutCount, 0);
  harness.stop();
});

test("callbacks antiguos no actualizan estado después de desuscribirse", () => {
  const harness = createHarness();
  harness.emitAuth({ uid: "patient-old" });
  const oldListener = harness.listeners[0];
  harness.emitAuth(null);
  oldListener.onNext({ exists: () => true, data: () => ({ blocked: true }) });

  assert.equal(harness.counts().signOutCount, 0);
  assert.equal(harness.statuses.at(-1), "signed-out");
  harness.stop();
});
