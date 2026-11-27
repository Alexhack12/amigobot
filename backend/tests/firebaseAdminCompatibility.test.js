const test = require("node:test");
const assert = require("node:assert/strict");
const { cert, getApps, initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { FieldValue, getFirestore } = require("firebase-admin/firestore");

test("firebase-admin 14 expone las APIs modulares usadas por el inicializador", () => {
  assert.equal(typeof cert, "function");
  assert.equal(typeof getApps, "function");
  assert.equal(typeof initializeApp, "function");
  assert.equal(typeof getAuth, "function");
  assert.equal(typeof getFirestore, "function");
  assert.equal(typeof FieldValue.serverTimestamp, "function");
});
