import { neon } from "@neondatabase/serverless";
import {
  DEFAULT_TEMPLATE_CONFIG,
  type CertificateRecord,
  type CertificateTemplateRecord,
  type EventRecord,
  type TemplateConfig,
  type TemplateUsageRecord,
  type TemplateVersionRecord
} from "./types";

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
    return { configured: false, ok: false, message: "DATABASE_URL belum tersedia." };
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

async function seedDefaultTemplate(query: ReturnType<typeof db>) {
  await query.query(
    "INSERT INTO certificate_templates " +
      "(id, name, description, template_image_url, template_config, is_default, status) " +
      "VALUES ($1,$2,$3,$4,$5::jsonb,TRUE,'active') " +
      "ON CONFLICT (id) DO NOTHING",
    [
      "template-default-itts",
      "Template Default ITTS",
      "Template landscape standar ITTS untuk webinar, pelatihan, dan kegiatan umum.",
      null,
      JSON.stringify(DEFAULT_TEMPLATE_CONFIG)
    ]
  );
}

async function migrateLegacyTemplates(query: ReturnType<typeof db>) {
  const events = (await query.query(
    "SELECT id, title, template_image_url, template_config " +
      "FROM events WHERE template_id IS NULL ORDER BY created_at ASC"
  )) as Record<string, unknown>[];

  for (const row of events) {
    const eventId = String(row.id);
    const templateId = "legacy-" + eventId;
    const config =
      row.template_config && typeof row.template_config === "object"
        ? row.template_config
        : DEFAULT_TEMPLATE_CONFIG;

    await query.query(
      "INSERT INTO certificate_templates " +
        "(id, name, description, template_image_url, template_config, is_default, status) " +
        "VALUES ($1,$2,$3,$4,$5::jsonb,FALSE,'active') " +
        "ON CONFLICT (id) DO NOTHING",
      [
        templateId,
        "Template - " + String(row.title),
        "Template hasil migrasi otomatis dari kegiatan lama. Dapat digunakan ulang atau diganti dengan template lain.",
        row.template_image_url ?? null,
        JSON.stringify(config)
      ]
    );

    await query.query(
      "UPDATE events SET template_id=$1 WHERE id=$2 AND template_id IS NULL",
      [templateId, eventId]
    );
  }
}

async function migrateTemplateVersions(query: ReturnType<typeof db>) {
  const templates = (await query.query(
    "SELECT id, template_image_url, template_config, current_version_id, current_version " +
      "FROM certificate_templates ORDER BY created_at ASC"
  )) as Record<string, unknown>[];

  for (const row of templates) {
    const templateId = String(row.id);
    const versions = (await query.query(
      "SELECT id, version_number FROM certificate_template_versions " +
        "WHERE template_id=$1 ORDER BY version_number DESC LIMIT 1",
      [templateId]
    )) as Record<string, unknown>[];

    let currentVersionId = versions[0]?.id ? String(versions[0].id) : "";
    let currentVersion = Number(versions[0]?.version_number ?? 0);

    if (!currentVersionId) {
      currentVersion = 1;
      currentVersionId = templateId + "-v1";

      await query.query(
        "INSERT INTO certificate_template_versions " +
          "(id, template_id, version_number, template_image_url, template_config, change_note) " +
          "VALUES ($1,$2,1,$3,$4::jsonb,$5) " +
          "ON CONFLICT (template_id, version_number) DO NOTHING",
        [
          currentVersionId,
          templateId,
          row.template_image_url ?? null,
          JSON.stringify(row.template_config ?? DEFAULT_TEMPLATE_CONFIG),
          "Versi awal hasil migrasi"
        ]
      );

      const actual = (await query.query(
        "SELECT id, version_number FROM certificate_template_versions " +
          "WHERE template_id=$1 ORDER BY version_number DESC LIMIT 1",
        [templateId]
      )) as Record<string, unknown>[];

      currentVersionId = String(actual[0]?.id ?? currentVersionId);
      currentVersion = Number(actual[0]?.version_number ?? 1);
    }

    await query.query(
      "UPDATE certificate_templates SET current_version_id=$1, current_version=$2 " +
        "WHERE id=$3 AND (current_version_id IS NULL OR current_version_id='')",
      [currentVersionId, currentVersion, templateId]
    );
  }

  await query.query(
    "UPDATE certificates c SET " +
      "template_version_id=t.current_version_id, template_version_number=t.current_version " +
      "FROM events e JOIN certificate_templates t ON t.id=e.template_id " +
      "WHERE c.event_id=e.id AND c.template_version_id IS NULL"
  );
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
        "CREATE TABLE IF NOT EXISTS certificate_templates (" +
          "id TEXT PRIMARY KEY, " +
          "name TEXT NOT NULL, " +
          "description TEXT, " +
          "template_image_url TEXT, " +
          "template_config JSONB NOT NULL, " +
          "is_default BOOLEAN NOT NULL DEFAULT FALSE, " +
          "status TEXT NOT NULL DEFAULT 'active', " +
          "created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), " +
          "updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()" +
        ")"
      );

      await query.query("ALTER TABLE events ADD COLUMN IF NOT EXISTS template_id TEXT");
      await query.query(
        "ALTER TABLE certificate_templates ADD COLUMN IF NOT EXISTS current_version_id TEXT"
      );
      await query.query(
        "ALTER TABLE certificate_templates ADD COLUMN IF NOT EXISTS current_version INTEGER NOT NULL DEFAULT 1"
      );
      await query.query(
        "ALTER TABLE certificates ADD COLUMN IF NOT EXISTS template_version_id TEXT"
      );
      await query.query(
        "ALTER TABLE certificates ADD COLUMN IF NOT EXISTS template_version_number INTEGER"
      );
      await query.query(
        "ALTER TABLE certificates ADD COLUMN IF NOT EXISTS issuance_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb"
      );

      await query.query(
        "CREATE TABLE IF NOT EXISTS certificate_template_versions (" +
          "id TEXT PRIMARY KEY, " +
          "template_id TEXT NOT NULL REFERENCES certificate_templates(id) ON DELETE CASCADE, " +
          "version_number INTEGER NOT NULL, " +
          "template_image_url TEXT, " +
          "template_config JSONB NOT NULL, " +
          "change_note TEXT, " +
          "created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), " +
          "UNIQUE(template_id, version_number)" +
        ")"
      );

      await query.query(
        "CREATE INDEX IF NOT EXISTS idx_certificates_event_id ON certificates(event_id)"
      );
      await query.query(
        "CREATE INDEX IF NOT EXISTS idx_certificates_public_id ON certificates(public_id)"
      );
      await query.query(
        "CREATE INDEX IF NOT EXISTS idx_certificates_template_version_id ON certificates(template_version_id)"
      );
      await query.query(
        "CREATE INDEX IF NOT EXISTS idx_events_template_id ON events(template_id)"
      );
      await query.query(
        "CREATE INDEX IF NOT EXISTS idx_certificate_templates_status ON certificate_templates(status)"
      );
      await query.query(
        "CREATE INDEX IF NOT EXISTS idx_template_versions_template_id ON certificate_template_versions(template_id)"
      );

      await seedDefaultTemplate(query);
      await migrateLegacyTemplates(query);
      await migrateTemplateVersions(query);
      await query.query(
        "UPDATE certificates c SET issuance_snapshot=jsonb_build_object(" +
          "'event_title', e.title, " +
          "'event_date', e.event_date::text, " +
          "'organizer', e.organizer, " +
          "'signatory', e.signatory, " +
          "'certificate_prefix', e.certificate_prefix" +
        ") FROM events e " +
        "WHERE c.event_id=e.id AND c.issuance_snapshot='{}'::jsonb"
      );
    })();
  }

  try {
    await schemaReady;
  } catch (error) {
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
    template_id: row.template_id ? String(row.template_id) : null,
    template_name: row.template_name ? String(row.template_name) : null,
    template_current_version:
      row.template_current_version === undefined || row.template_current_version === null
        ? null
        : Number(row.template_current_version),
    event_date: normalizeDateOnly(row.event_date),
    template_config: (row.template_config ?? DEFAULT_TEMPLATE_CONFIG) as TemplateConfig
  };
}

function normalizeTemplate(row: Record<string, unknown>): CertificateTemplateRecord {
  return {
    ...(row as unknown as CertificateTemplateRecord),
    is_default: Boolean(row.is_default),
    current_version_id: row.current_version_id ? String(row.current_version_id) : null,
    current_version: Number(row.current_version ?? 1),
    usage_count:
      row.usage_count === undefined ? undefined : Number(row.usage_count ?? 0),
    template_config: (row.template_config ?? DEFAULT_TEMPLATE_CONFIG) as TemplateConfig
  };
}

function normalizeTemplateVersion(row: Record<string, unknown>): TemplateVersionRecord {
  return {
    ...(row as unknown as TemplateVersionRecord),
    version_number: Number(row.version_number ?? 1),
    certificate_count:
      row.certificate_count === undefined ? undefined : Number(row.certificate_count ?? 0),
    template_config: (row.template_config ?? DEFAULT_TEMPLATE_CONFIG) as TemplateConfig
  };
}

const EVENT_SELECT =
  "SELECT e.*, t.name AS template_name, t.current_version AS template_current_version, " +
  "COALESCE(t.template_image_url, e.template_image_url) AS resolved_template_image_url, " +
  "COALESCE(t.template_config, e.template_config) AS resolved_template_config " +
  "FROM events e LEFT JOIN certificate_templates t ON t.id=e.template_id ";

function normalizeResolvedEvent(row: Record<string, unknown>) {
  return normalizeEvent({
    ...row,
    template_image_url:
      row.resolved_template_image_url === undefined
        ? row.template_image_url
        : row.resolved_template_image_url,
    template_config: row.resolved_template_config ?? row.template_config
  });
}

export async function listEvents() {
  await ensureSchema();
  const rows = await db().query(
    EVENT_SELECT + "ORDER BY e.event_date DESC, e.created_at DESC"
  );
  return rows.map((row) => normalizeResolvedEvent(row as Record<string, unknown>));
}

export async function listEventsWithStats() {
  await ensureSchema();
  const rows = await db().query(
    "SELECT e.*, t.name AS template_name, t.current_version AS template_current_version, " +
      "COALESCE(t.template_image_url, e.template_image_url) AS resolved_template_image_url, " +
      "COALESCE(t.template_config, e.template_config) AS resolved_template_config, " +
      "COUNT(c.id)::int AS certificate_count, " +
      "COUNT(c.id) FILTER (WHERE c.status='valid')::int AS valid_count, " +
      "COUNT(c.id) FILTER (WHERE c.status='revoked')::int AS revoked_count " +
      "FROM events e " +
      "LEFT JOIN certificate_templates t ON t.id=e.template_id " +
      "LEFT JOIN certificates c ON c.event_id=e.id " +
      "GROUP BY e.id, t.id " +
      "ORDER BY e.event_date DESC, e.created_at DESC"
  );

  return rows.map((row) => {
    const raw = row as Record<string, unknown>;
    return {
      ...normalizeResolvedEvent(raw),
      certificate_count: Number(raw.certificate_count ?? 0),
      valid_count: Number(raw.valid_count ?? 0),
      revoked_count: Number(raw.revoked_count ?? 0)
    };
  });
}

export async function getEvent(id: string) {
  await ensureSchema();
  const rows = await db().query(EVENT_SELECT + "WHERE e.id=$1 LIMIT 1", [id]);
  return rows[0] ? normalizeResolvedEvent(rows[0] as Record<string, unknown>) : null;
}

export async function getEventBySlug(slug: string) {
  await ensureSchema();
  const rows = await db().query(EVENT_SELECT + "WHERE e.slug=$1 LIMIT 1", [slug]);
  return rows[0] ? normalizeResolvedEvent(rows[0] as Record<string, unknown>) : null;
}

export async function listCertificateTemplates(includeArchived = false) {
  await ensureSchema();
  const where = includeArchived ? "" : "WHERE t.status='active' ";
  const rows = await db().query(
    "SELECT t.*, COUNT(e.id)::int AS usage_count " +
      "FROM certificate_templates t " +
      "LEFT JOIN events e ON e.template_id=t.id " +
      where +
      "GROUP BY t.id " +
      "ORDER BY t.is_default DESC, t.updated_at DESC, t.name ASC"
  );
  return rows.map((row) => normalizeTemplate(row as Record<string, unknown>));
}

export async function getCertificateTemplate(id: string) {
  await ensureSchema();
  const rows = await db().query(
    "SELECT t.*, COUNT(e.id)::int AS usage_count " +
      "FROM certificate_templates t " +
      "LEFT JOIN events e ON e.template_id=t.id " +
      "WHERE t.id=$1 GROUP BY t.id LIMIT 1",
    [id]
  );
  return rows[0] ? normalizeTemplate(rows[0] as Record<string, unknown>) : null;
}

export async function getDefaultCertificateTemplate() {
  await ensureSchema();
  const rows = await db().query(
    "SELECT * FROM certificate_templates " +
      "WHERE status='active' ORDER BY is_default DESC, created_at ASC LIMIT 1"
  );
  return rows[0] ? normalizeTemplate(rows[0] as Record<string, unknown>) : null;
}

export async function listTemplateVersions(templateId: string) {
  await ensureSchema();
  const rows = await db().query(
    "SELECT v.*, COUNT(c.id)::int AS certificate_count " +
      "FROM certificate_template_versions v " +
      "LEFT JOIN certificates c ON c.template_version_id=v.id " +
      "WHERE v.template_id=$1 GROUP BY v.id " +
      "ORDER BY v.version_number DESC",
    [templateId]
  );
  return rows.map((row) =>
    normalizeTemplateVersion(row as Record<string, unknown>)
  );
}

export async function getTemplateVersion(id: string) {
  await ensureSchema();
  const rows = await db().query(
    "SELECT * FROM certificate_template_versions WHERE id=$1 LIMIT 1",
    [id]
  );
  return rows[0]
    ? normalizeTemplateVersion(rows[0] as Record<string, unknown>)
    : null;
}

export async function getCertificateRenderTemplate(certificateId: string) {
  await ensureSchema();
  const rows = await db().query(
    "SELECT v.* FROM certificates c " +
      "JOIN events e ON e.id=c.event_id " +
      "JOIN certificate_templates t ON t.id=e.template_id " +
      "JOIN certificate_template_versions v " +
        "ON v.id=COALESCE(c.template_version_id,t.current_version_id) " +
      "WHERE c.id=$1 LIMIT 1",
    [certificateId]
  );

  return rows[0]
    ? normalizeTemplateVersion(rows[0] as Record<string, unknown>)
    : null;
}

export async function listTemplateUsage(templateId: string): Promise<TemplateUsageRecord[]> {
  await ensureSchema();
  const rows = await db().query(
    "SELECT e.id, e.title, e.event_date, e.status, COUNT(c.id)::int AS certificate_count " +
      "FROM events e LEFT JOIN certificates c ON c.event_id=e.id " +
      "WHERE e.template_id=$1 " +
      "GROUP BY e.id ORDER BY e.event_date DESC, e.created_at DESC",
    [templateId]
  );

  return rows.map((row) => ({
    id: String(row.id),
    title: String(row.title),
    event_date: normalizeDateOnly(row.event_date),
    status: String(row.status) as TemplateUsageRecord["status"],
    certificate_count: Number(row.certificate_count ?? 0)
  }));
}

export async function listCertificates(eventId: string) {
  await ensureSchema();
  const rows = await db().query(
    "SELECT * FROM certificates WHERE event_id=$1 ORDER BY issued_at DESC",
    [eventId]
  );

  return rows.map((row) => ({
    ...(row as unknown as CertificateRecord),
    template_version_id: row.template_version_id
      ? String(row.template_version_id)
      : null,
    template_version_number:
      row.template_version_number === null || row.template_version_number === undefined
        ? null
        : Number(row.template_version_number)
  }));
}

export async function getCertificate(id: string) {
  await ensureSchema();
  const rows = await db().query("SELECT * FROM certificates WHERE id=$1 LIMIT 1", [id]);
  if (!rows[0]) return null;

  return {
    ...(rows[0] as unknown as CertificateRecord),
    template_version_id: rows[0].template_version_id
      ? String(rows[0].template_version_id)
      : null,
    template_version_number:
      rows[0].template_version_number === null ||
      rows[0].template_version_number === undefined
        ? null
        : Number(rows[0].template_version_number)
  };
}

export async function getCertificateByPublicId(publicId: string) {
  await ensureSchema();
  const rows = await db().query(
    "SELECT * FROM certificates WHERE public_id=$1 LIMIT 1",
    [publicId]
  );
  if (!rows[0]) return null;

  return {
    ...(rows[0] as unknown as CertificateRecord),
    template_version_id: rows[0].template_version_id
      ? String(rows[0].template_version_id)
      : null,
    template_version_number:
      rows[0].template_version_number === null ||
      rows[0].template_version_number === undefined
        ? null
        : Number(rows[0].template_version_number)
  };
}

export async function getDashboardStats() {
  await ensureSchema();

  const [eventRows, certRows, validRows, revokedRows] = await Promise.all([
    db().query("SELECT COUNT(*)::int AS count FROM events"),
    db().query("SELECT COUNT(*)::int AS count FROM certificates"),
    db().query("SELECT COUNT(*)::int AS count FROM certificates WHERE status='valid'"),
    db().query("SELECT COUNT(*)::int AS count FROM certificates WHERE status='revoked'")
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
