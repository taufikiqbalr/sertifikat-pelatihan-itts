import { neon } from "@neondatabase/serverless";
import type { CertificateRecord, EventRecord, TemplateConfig } from "./types";

let schemaReady: Promise<void> | null = null;

export function getDatabaseUrl() {
  return (
    process.env.DATABASE_URL?.trim() ||
    process.env.POSTGRES_URL?.trim() ||
    process.env.NEON_DATABASE_URL?.trim() ||
    ""
  );
}

export function hasDatabaseConfig() {
  return Boolean(getDatabaseUrl());
}

function db() {
  const databaseUrl = getDatabaseUrl();

  if (!databaseUrl) {
    throw new Error(
      "Database belum dikonfigurasi. Pastikan DATABASE_URL dari Neon tersedia pada environment deployment ini."
    );
  }

  return neon(databaseUrl);
}

export function databaseErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  if (/DATABASE_URL|belum dikonfigurasi/i.test(message)) {
    return "Database belum dikonfigurasi pada environment deployment ini.";
  }
  if (/password authentication failed|authentication failed/i.test(message)) {
    return "Kredensial koneksi Neon ditolak. Hubungkan ulang resource Neon ke project.";
  }
  if (/ENOTFOUND|ECONNREFUSED|fetch failed|network/i.test(message)) {
    return "Aplikasi tidak dapat menjangkau Neon. Periksa koneksi resource dan environment DATABASE_URL.";
  }

  return "Koneksi database gagal. Periksa resource Neon dan DATABASE_URL pada Vercel.";
}

export async function checkDatabaseConnection() {
  if (!hasDatabaseConfig()) {
    return {
      configured: false,
      ok: false,
      message: "DATABASE_URL belum tersedia."
    };
  }

  try {
    const rows = await db().query("SELECT 1 AS ok");
    return {
      configured: true,
      ok: Number(rows[0]?.ok ?? 0) === 1,
      message: "Database dapat diakses."
    };
  } catch (error) {
    console.error("[db] health check failed", error);
    return {
      configured: true,
      ok: false,
      message: databaseErrorMessage(error)
    };
  }
}

export async function ensureSchema() {
  if (!schemaReady) {
    schemaReady = (async () => {
      const query = db();

      await query.query(
        "CREATE TABLE IF NOT EXISTS events (" +
          "id TEXT PRIMARY KEY, " +
          "slug TEXT UNIQUE NOT NULL, " +
          "title TEXT NOT NULL, " +
          "event_date DATE NOT NULL, " +
          "organizer TEXT NOT NULL, " +
          "signatory TEXT NOT NULL DEFAULT '', " +
          "description TEXT, " +
          "certificate_prefix TEXT NOT NULL DEFAULT 'ITTS/CERT', " +
          "template_image_url TEXT, " +
          "template_config JSONB NOT NULL, " +
          "status TEXT NOT NULL DEFAULT 'active', " +
          "created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), " +
          "updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()" +
        ")"
      );

      await query.query(
        "CREATE TABLE IF NOT EXISTS certificates (" +
          "id TEXT PRIMARY KEY, " +
          "public_id TEXT UNIQUE NOT NULL, " +
          "event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE, " +
          "participant_name TEXT NOT NULL, " +
          "participant_email TEXT, " +
          "certificate_number TEXT UNIQUE NOT NULL, " +
          "custom_data JSONB NOT NULL DEFAULT '{}'::jsonb, " +
          "status TEXT NOT NULL DEFAULT 'valid', " +
          "issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), " +
          "revoked_at TIMESTAMPTZ, " +
          "revoke_reason TEXT" +
        ")"
      );

      await query.query(
        "CREATE INDEX IF NOT EXISTS idx_certificates_event_id ON certificates(event_id)"
      );
      await query.query(
        "CREATE INDEX IF NOT EXISTS idx_certificates_public_id ON certificates(public_id)"
      );
    })();
  }

  try {
    await schemaReady;
  } catch (error) {
    // Serverless instance dapat hidup cukup lama. Jangan cache promise gagal selamanya.
    schemaReady = null;
    console.error("[db] schema initialization failed", error);
    throw error;
  }
}

function normalizeDateOnly(value: unknown) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  const raw = String(value ?? "");
  const match = raw.match(/\d{4}-\d{2}-\d{2}/);
  return match?.[0] ?? raw;
}

function normalizeEvent(row: Record<string, unknown>): EventRecord {
  return {
    ...(row as unknown as EventRecord),
    event_date: normalizeDateOnly(row.event_date),
    template_config: row.template_config as TemplateConfig
  };
}

export async function listEvents() {
  await ensureSchema();
  const rows = await db().query(
    "SELECT * FROM events ORDER BY event_date DESC, created_at DESC"
  );
  return rows.map((row) => normalizeEvent(row as Record<string, unknown>));
}

export async function getEvent(id: string) {
  await ensureSchema();
  const rows = await db().query("SELECT * FROM events WHERE id = $1 LIMIT 1", [id]);
  return rows[0] ? normalizeEvent(rows[0] as Record<string, unknown>) : null;
}

export async function getEventBySlug(slug: string) {
  await ensureSchema();
  const rows = await db().query("SELECT * FROM events WHERE slug = $1 LIMIT 1", [slug]);
  return rows[0] ? normalizeEvent(rows[0] as Record<string, unknown>) : null;
}

export async function listCertificates(eventId: string) {
  await ensureSchema();
  return (await db().query(
    "SELECT * FROM certificates WHERE event_id = $1 ORDER BY issued_at DESC",
    [eventId]
  )) as CertificateRecord[];
}

export async function getCertificate(id: string) {
  await ensureSchema();
  const rows = await db().query("SELECT * FROM certificates WHERE id = $1 LIMIT 1", [id]);
  return (rows[0] as CertificateRecord | undefined) ?? null;
}

export async function getCertificateByPublicId(publicId: string) {
  await ensureSchema();
  const rows = await db().query(
    "SELECT * FROM certificates WHERE public_id = $1 LIMIT 1",
    [publicId]
  );
  return (rows[0] as CertificateRecord | undefined) ?? null;
}

export async function getDashboardStats() {
  await ensureSchema();

  const [eventRows, certRows, validRows, revokedRows] = await Promise.all([
    db().query("SELECT COUNT(*)::int AS count FROM events"),
    db().query("SELECT COUNT(*)::int AS count FROM certificates"),
    db().query("SELECT COUNT(*)::int AS count FROM certificates WHERE status = 'valid'"),
    db().query("SELECT COUNT(*)::int AS count FROM certificates WHERE status = 'revoked'")
  ]);

  return {
    events: Number(eventRows[0]?.count ?? 0),
    certificates: Number(certRows[0]?.count ?? 0),
    valid: Number(validRows[0]?.count ?? 0),
    revoked: Number(revokedRows[0]?.count ?? 0)
  };
}

export async function runQuery(queryText: string, params: unknown[] = []) {
  await ensureSchema();
  return db().query(queryText, params);
}
