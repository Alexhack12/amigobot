const { cert, getApps, initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { FieldValue, getFirestore } = require("firebase-admin/firestore");

const getServiceAccount = () => {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

    if (
      !serviceAccount.project_id ||
      !serviceAccount.client_email ||
      !serviceAccount.private_key
    ) {
      throw new Error("FIREBASE_SERVICE_ACCOUNT está incompleto.");
    }

    return serviceAccount;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT es obligatorio en producción."
    );
  }

  return require("./serviceAccountKey.json");
};

const app =
  getApps()[0] ||
  initializeApp({
    credential: cert(getServiceAccount()),
  });

const db = getFirestore(app);
const auth = getAuth(app);

// Fachada limitada para conservar las llamadas existentes a serverTimestamp.
// No reintroduce la API de espacio de nombres eliminada por firebase-admin 14.
const admin = {
  firestore: {
    FieldValue,
  },
};

module.exports = {
  admin,
  db,
  auth,
};
