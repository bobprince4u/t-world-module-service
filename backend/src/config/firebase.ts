import { readFileSync } from "node:fs";

import { cert, getApp, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

import { env } from "./env.js";

const serviceAccount = JSON.parse(
  readFileSync(env.FIREBASE_SERVICE_ACCOUNT_PATH, "utf8"),
);

const firebaseApp =
  getApps().length > 0
    ? getApp()
    : initializeApp({
        credential: cert(serviceAccount),
        projectId: env.FIREBASE_PROJECT_ID,
      });

export const firebaseAuth = getAuth(firebaseApp);
