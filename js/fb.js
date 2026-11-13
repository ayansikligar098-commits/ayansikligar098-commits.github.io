// Shared Firebase helpers for the Link To QR website.
// Uses the SAME Firebase project (link-to-qr-25307), the SAME collections
// and the SAME field names as the Android app and the Admin app, so an
// account / premium / payment request made here is identical to one made
// in the app (verified against AppData.java, SubscriptionActivity.java,
// ProfileSync.java and admin Config.java).
import { initializeApp } from "../vendor/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signOut,
  signInWithEmailAndPassword, createUserWithEmailAndPassword,
  sendEmailVerification, sendPasswordResetEmail,
  GoogleAuthProvider, signInWithPopup, updateProfile
} from "../vendor/firebase-auth.js";
import {
  getFirestore, doc, getDoc, setDoc, addDoc, collection,
  query, where, orderBy, limit, getDocs, serverTimestamp,
  writeBatch, updateDoc, increment
} from "../vendor/firebase-firestore.js";
import { getStorage, ref, uploadBytes } from "../vendor/firebase-storage.js";
import { firebaseConfig } from "./firebase-config.js";

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export {
  onAuthStateChanged, signOut, signInWithEmailAndPassword,
  createUserWithEmailAndPassword, sendEmailVerification,
  sendPasswordResetEmail, GoogleAuthProvider, signInWithPopup,
  updateProfile, doc, getDoc, setDoc, addDoc, collection, query,
  where, orderBy, limit, getDocs, serverTimestamp, ref, uploadBytes,
  writeBatch, updateDoc, increment
};

export const PLAN_KEYS = ["1m", "3m", "6m", "1y"];
export const PLAN_NAMES = { "1m": "1 Month", "3m": "3 Months", "6m": "6 Months", "1y": "1 Year" };
export const PLAN_MONTHS = { "1m": 1, "3m": 3, "6m": 6, "1y": 12 };
export const DEFAULT_PRICES = { price1m: 99, price3m: 249, price6m: 499, price1y: 899 };

/** True when the signed-in user must still verify their email
 *  (same rule as the app's VerifyEmailActivity: password provider +
 *  emailVerified === false). Google accounts are always verified. */
export function needsEmailVerify(user) {
  if (!user) return false;
  const hasPassword = (user.providerData || []).some(p => p.providerId === "password");
  return hasPassword && !user.emailVerified;
}

/** settings/config — public read, same doc the apps use. */
export async function loadConfig() {
  try {
    const snap = await getDoc(doc(db, "settings", "config"));
    return snap.exists() ? snap.data() : {};
  } catch (e) {
    return {};
  }
}

export function planPrice(cfg, key) {
  const src = (cfg && cfg.prices) ? cfg.prices : (cfg || {});
  const v = Number(src["price" + key]);
  return Number.isFinite(v) && v > 0 ? v : DEFAULT_PRICES["price" + key];
}

/** users/{uid} profile doc (premium, premiumUntil, banned, ...). */
export async function loadProfile(uid) {
  try {
    const snap = await getDoc(doc(db, "users", uid));
    return snap.exists() ? snap.data() : null;
  } catch (e) {
    return null;
  }
}

/** Create/refresh the users/{uid} doc the same way the app does
 *  (ProfileSync: name, email, lastActive; the app never writes premium
 *  fields from the client — those are admin-only). */
export async function touchProfile(user, nameOverride) {
  const data = {
    name: nameOverride || user.displayName || "",
    email: user.email || "",
    lastActive: serverTimestamp()
  };
  try {
    await setDoc(doc(db, "users", user.uid), data, { merge: true });
  } catch (e) { /* profile sync is best-effort, same as the app */ }
}

export function isPremium(profile) {
  if (!profile || profile.premium !== true) return false;
  const until = profile.premiumUntil;
  if (!until) return true;
  const ms = typeof until.toMillis === "function" ? until.toMillis()
    : (until.seconds ? until.seconds * 1000 : Number(until) || 0);
  return ms === 0 || ms > Date.now();
}

export function fmtDate(ts) {
  if (!ts) return "";
  const ms = typeof ts.toMillis === "function" ? ts.toMillis()
    : (ts.seconds ? ts.seconds * 1000 : Number(ts) || 0);
  if (!ms) return "";
  return new Date(ms).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
