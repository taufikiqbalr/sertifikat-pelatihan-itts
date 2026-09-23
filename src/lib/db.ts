import { neon } from "@neondatabase/serverless";
import type { CertificateRecord, EventRecord, TemplateConfig } from "./types";

const databaseUrl = process.env.DATABASE_URL;
const sql = databaseUrl ? neon(databaseUrl) : null;
let schemaReady: Promise<void> | null = null;

function db() {
  if (!sql) {
    throw new Error("DATABASE_URL belum dikonfigurasi. Hubungkan PostgreSQL/Neon pada Vercel.");
  }
  return sql;
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
      await query.query("CREATE INDEX IF NOT EXISTS idx_certificates_event_id ON certificates(event_id)");
      await query.query("CREATE INDEX IF NOT EXISTS idx_certificates_public_id ON certificates(public_id)");
    })();
  }
  return schemaReady;
}

function normalizeEvent(row: Record<string, unknown>): EventRecord {
  return {
    ...(row as unknown as EventRecord),
    event_date: String(row.event_date).slice(0, 10),
    template_config: row.template_config as TemplateConfig
  };
}

export async function listEvents() {
  await ensureSchema();
  const rows = await db().query("SELECT * FROM events ORDER BY event_date DESC, created_at DESC");
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
  const rows = await db().query("SELECT * FROM certificates WHERE public_id = $1 LIMIT 1", [publicId]);
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
