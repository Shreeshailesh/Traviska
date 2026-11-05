const { initializeApp, cert, getApps } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");

let serviceAccount;

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  // Production: credentials stored securely in Render
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
} else {
  // Local development: credentials stored in ignored JSON file
  serviceAccount = require("./serviceAccountKey.json");
}

if (getApps().length === 0) {
  initializeApp({
    credential: cert(serviceAccount),
  });
}

module.exports = {
  auth: getAuth,
};