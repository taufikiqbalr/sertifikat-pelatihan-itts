import "server-only";
import crypto from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const COOKIE_NAME = "itts_cert_admin";

function explicitSecret() {
  const value = process.env.AUTH_SECRET?.trim();
  return value && value.length >= 24 ? value : null;
}

function derivedFallbackSecret() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase() ?? "";
  const password = process.env.ADMIN_PASSWORD ?? "";

  if (!email || !password) {
    throw new Error(
      "Konfigurasi autentikasi belum lengkap. ADMIN_EMAIL dan ADMIN_PASSWORD wajib diisi."
    );
  }

  // Fallback supaya login tidak crash jika AUTH_SECRET belum diset.
  // Untuk production tetap disarankan menggunakan AUTH_SECRET acak tersendiri.
  return crypto
    .createHash("sha256")
    .update(email + "|" + password + "|itts-certificate-session-v1")
    .digest("base64url");
}

function sessionSecret() {
  return explicitSecret() ?? derivedFallbackSecret();
}

function sign(value: string) {
  return crypto.createHmac("sha256", sessionSecret()).update(value).digest("base64url");
}

function safeEqual(a: string, b: string) {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  return aBuf.length === bBuf.length && crypto.timingSafeEqual(aBuf, bBuf);
}

export function verifyCredentials(email: string, password: string) {
  const expectedEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase() ?? "";
  const expectedPassword = process.env.ADMIN_PASSWORD ?? "";

  return (
    expectedEmail.length > 0 &&
    expectedPassword.length > 0 &&
    safeEqual(email.trim().toLowerCase(), expectedEmail) &&
    safeEqual(password, expectedPassword)
  );
}

export function getAuthConfiguration() {
  return {
    adminEmailConfigured: Boolean(process.env.ADMIN_EMAIL?.trim()),
    adminPasswordConfigured: Boolean(process.env.ADMIN_PASSWORD),
    authSecretConfigured: Boolean(explicitSecret()),
    sessionSecretSource: explicitSecret() ? "AUTH_SECRET" : "derived-fallback"
  };
}

export async function createAdminSession(email: string) {
  const payload = Buffer.from(
    JSON.stringify({
      email: email.trim().toLowerCase(),
      exp: Date.now() + 12 * 60 * 60 * 1000
    }),
    "utf8"
  ).toString("base64url");

  const token = payload + "." + sign(payload);
  const jar = await cookies();

  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 12 * 60 * 60
  });
}

export async function isAdmin() {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return false;

  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;

  try {
    if (!safeEqual(sign(payload), signature)) return false;

    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      email: string;
      exp: number;
    };

    return (
      data.email === (process.env.ADMIN_EMAIL?.trim().toLowerCase() ?? "") &&
      data.exp > Date.now()
    );
  } catch (error) {
    console.error("[auth] session validation failed", error);
    return false;
  }
}

export async function requireAdmin() {
  if (!(await isAdmin())) redirect("/login");
}

export async function clearAdminSession() {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}
