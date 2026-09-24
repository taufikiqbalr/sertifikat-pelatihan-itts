"use server";

import crypto from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { clearAdminSession, requireAdmin } from "@/lib/auth";
import {
  getCertificateTemplate,
  getEvent,
  getTemplateVersion,
  runQuery
} from "@/lib/db";
import {
  DEFAULT_TEMPLATE_CONFIG,
  slugify,
  type TemplateConfig
} from "@/lib/types";

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function parseConfig(value: string): TemplateConfig {
  if (!value) return DEFAULT_TEMPLATE_CONFIG;
  try {
    const parsed = JSON.parse(value) as TemplateConfig;
    if (!Array.isArray(parsed.fields) || !parsed.qr) throw new Error("invalid");
    return parsed;
  } catch {
    return DEFAULT_TEMPLATE_CONFIG;
  }
}

function autoCertificateNumber(prefix: string, eventDate: string) {
  const year = eventDate.slice(0, 4);
  const suffix = crypto.randomBytes(4).toString("hex").toUpperCase();
  return [prefix || "ITTS/CERT", year, suffix].filter(Boolean).join("/");
}

async function resolveTemplate(templateId: string) {
  let template = templateId ? await getCertificateTemplate(templateId) : null;

  if (!template) {
    const rows = await runQuery(
      "SELECT id FROM certificate_templates " +
        "WHERE status='active' ORDER BY is_default DESC, created_at ASC LIMIT 1"
    );
    const fallbackId = rows[0]?.id ? String(rows[0].id) : "";
    template = fallbackId ? await getCertificateTemplate(fallbackId) : null;
  }

  if (!template) {
    throw new Error("Belum ada template sertifikat aktif. Buat template terlebih dahulu.");
  }

  return template;
}

async function nextTemplateVersion(templateId: string) {
  const rows = await runQuery(
    "SELECT COALESCE(MAX(version_number),0)::int + 1 AS next_version " +
      "FROM certificate_template_versions WHERE template_id=$1",
    [templateId]
  );
  return Number(rows[0]?.next_version ?? 1);
}

async function createTemplateVersion({
  templateId,
  versionNumber,
  imageUrl,
  config,
  note
}: {
  templateId: string;
  versionNumber: number;
  imageUrl: string | null;
  config: TemplateConfig;
  note: string;
}) {
  const versionId = crypto.randomUUID();

  await runQuery(
    "INSERT INTO certificate_template_versions " +
      "(id, template_id, version_number, template_image_url, template_config, change_note) " +
      "VALUES ($1,$2,$3,$4,$5::jsonb,$6)",
    [
      versionId,
      templateId,
      versionNumber,
      imageUrl,
      JSON.stringify(config),
      note || "Perubahan template"
    ]
  );

  return versionId;
}

export async function logoutAction() {
  await clearAdminSession();
  redirect("/");
}

export async function saveEventAction(formData: FormData) {
  await requireAdmin();

  const existingId = text(formData, "id");
  const title = text(formData, "title");
  const eventDate = text(formData, "event_date");
  const organizer = text(formData, "organizer");
  const signatory = text(formData, "signatory");
  const description = text(formData, "description");
  const prefix = text(formData, "certificate_prefix") || "ITTS/CERT";
  const status = text(formData, "status") || "active";
  const template = await resolveTemplate(text(formData, "template_id"));

  if (!title || !eventDate || !organizer) {
    throw new Error("Nama kegiatan, tanggal, dan penyelenggara wajib diisi.");
  }

  const templateImageUrl = template.template_image_url || null;
  const templateConfig = JSON.stringify(template.template_config);

  if (existingId) {
    await runQuery(
      "UPDATE events SET " +
        "title=$1, event_date=$2, organizer=$3, signatory=$4, description=$5, " +
        "certificate_prefix=$6, template_id=$7, template_image_url=$8, " +
        "template_config=$9::jsonb, status=$10, updated_at=NOW() WHERE id=$11",
      [
        title,
        eventDate,
        organizer,
        signatory,
        description || null,
        prefix,
        template.id,
        templateImageUrl,
        templateConfig,
        status,
        existingId
      ]
    );

    revalidatePath("/admin");
    revalidatePath("/admin/events/" + existingId);
    revalidatePath("/admin/templates");
    redirect("/admin/events/" + existingId + "?saved=1");
  }

  const id = crypto.randomUUID();
  let slug = slugify(title) || "kegiatan";
  const duplicate = await runQuery("SELECT id FROM events WHERE slug=$1 LIMIT 1", [slug]);
  if (duplicate.length) slug += "-" + id.slice(0, 6);

  await runQuery(
    "INSERT INTO events " +
      "(id, slug, title, event_date, organizer, signatory, description, certificate_prefix, " +
      "template_id, template_image_url, template_config, status) " +
      "VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12)",
    [
      id,
      slug,
      title,
      eventDate,
      organizer,
      signatory,
      description || null,
      prefix,
      template.id,
      templateImageUrl,
      templateConfig,
      status
    ]
  );

  revalidatePath("/admin");
  revalidatePath("/admin/templates");
  redirect("/admin/events/" + id + "?created=1");
}

export async function saveTemplateAction(formData: FormData) {
  await requireAdmin();

  const existingId = text(formData, "id");
  const id = existingId || crypto.randomUUID();
  const name = text(formData, "name");
  const description = text(formData, "description");
  const imageUrl = text(formData, "template_image_url");
  const config = parseConfig(text(formData, "template_config"));
  const status = text(formData, "status") === "archived" ? "archived" : "active";
  const isDefault = text(formData, "is_default") === "true";
  const versionNote =
    text(formData, "version_note") ||
    (existingId ? "Pembaruan desain template" : "Versi awal template");

  if (!name) throw new Error("Nama template wajib diisi.");

  if (isDefault) {
    await runQuery("UPDATE certificate_templates SET is_default=FALSE WHERE id<>$1", [id]);
  }

  if (existingId) {
    const versionNumber = await nextTemplateVersion(id);
    const versionId = await createTemplateVersion({
      templateId: id,
      versionNumber,
      imageUrl: imageUrl || null,
      config,
      note: versionNote
    });

    await runQuery(
      "UPDATE certificate_templates SET " +
        "name=$1, description=$2, template_image_url=$3, template_config=$4::jsonb, " +
        "is_default=$5, status=$6, current_version_id=$7, current_version=$8, updated_at=NOW() " +
        "WHERE id=$9",
      [
        name,
        description || null,
        imageUrl || null,
        JSON.stringify(config),
        isDefault,
        isDefault ? "active" : status,
        versionId,
        versionNumber,
        id
      ]
    );

    await runQuery(
      "UPDATE events SET template_image_url=$1, template_config=$2::jsonb, updated_at=NOW() " +
        "WHERE template_id=$3",
      [imageUrl || null, JSON.stringify(config), id]
    );

    revalidatePath("/admin");
    revalidatePath("/admin/templates");
    revalidatePath("/admin/templates/" + id);
    redirect("/admin/templates/" + id + "?saved=1&version=" + versionNumber);
  }

  await runQuery(
    "INSERT INTO certificate_templates " +
      "(id, name, description, template_image_url, template_config, is_default, status, current_version) " +
      "VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7,1)",
    [
      id,
      name,
      description || null,
      imageUrl || null,
      JSON.stringify(config),
      isDefault,
      isDefault ? "active" : status
    ]
  );

  const versionId = await createTemplateVersion({
    templateId: id,
    versionNumber: 1,
    imageUrl: imageUrl || null,
    config,
    note: versionNote
  });

  await runQuery(
    "UPDATE certificate_templates SET current_version_id=$1, current_version=1 WHERE id=$2",
    [versionId, id]
  );

  revalidatePath("/admin");
  revalidatePath("/admin/templates");
  redirect("/admin/templates/" + id + "?created=1");
}

export async function duplicateTemplateAction(formData: FormData) {
  await requireAdmin();

  const sourceId = text(formData, "template_id");
  const source = await getCertificateTemplate(sourceId);
  if (!source) throw new Error("Template tidak ditemukan.");

  const id = crypto.randomUUID();
  await runQuery(
    "INSERT INTO certificate_templates " +
      "(id, name, description, template_image_url, template_config, is_default, status, current_version) " +
      "VALUES ($1,$2,$3,$4,$5::jsonb,FALSE,'active',1)",
    [
      id,
      source.name + " (Salinan)",
      source.description,
      source.template_image_url,
      JSON.stringify(source.template_config)
    ]
  );

  const versionId = await createTemplateVersion({
    templateId: id,
    versionNumber: 1,
    imageUrl: source.template_image_url,
    config: source.template_config,
    note: "Versi awal hasil duplikasi dari " + source.name
  });

  await runQuery(
    "UPDATE certificate_templates SET current_version_id=$1 WHERE id=$2",
    [versionId, id]
  );

  revalidatePath("/admin/templates");
  redirect("/admin/templates/" + id + "?duplicated=1");
}

export async function restoreTemplateVersionAction(formData: FormData) {
  await requireAdmin();

  const templateId = text(formData, "template_id");
  const versionId = text(formData, "version_id");
  const [template, sourceVersion] = await Promise.all([
    getCertificateTemplate(templateId),
    getTemplateVersion(versionId)
  ]);

  if (!template || !sourceVersion || sourceVersion.template_id !== templateId) {
    throw new Error("Versi template tidak ditemukan.");
  }

  const versionNumber = await nextTemplateVersion(templateId);
  const restoredVersionId = await createTemplateVersion({
    templateId,
    versionNumber,
    imageUrl: sourceVersion.template_image_url,
    config: sourceVersion.template_config,
    note: "Dipulihkan dari versi " + sourceVersion.version_number
  });

  await runQuery(
    "UPDATE certificate_templates SET template_image_url=$1, template_config=$2::jsonb, " +
      "current_version_id=$3, current_version=$4, updated_at=NOW() WHERE id=$5",
    [
      sourceVersion.template_image_url,
      JSON.stringify(sourceVersion.template_config),
      restoredVersionId,
      versionNumber,
      templateId
    ]
  );

  await runQuery(
    "UPDATE events SET template_image_url=$1, template_config=$2::jsonb, updated_at=NOW() " +
      "WHERE template_id=$3",
    [
      sourceVersion.template_image_url,
      JSON.stringify(sourceVersion.template_config),
      templateId
    ]
  );

  revalidatePath("/admin");
  revalidatePath("/admin/templates");
  revalidatePath("/admin/templates/" + templateId);
  redirect(
    "/admin/templates/" +
      templateId +
      "?restored=" +
      sourceVersion.version_number +
      "&version=" +
      versionNumber
  );
}

export async function setDefaultTemplateAction(formData: FormData) {
  await requireAdmin();

  const id = text(formData, "template_id");
  const template = await getCertificateTemplate(id);
  if (!template) throw new Error("Template tidak ditemukan.");

  await runQuery("UPDATE certificate_templates SET is_default=FALSE");
  await runQuery(
    "UPDATE certificate_templates SET is_default=TRUE, status='active', updated_at=NOW() WHERE id=$1",
    [id]
  );

  revalidatePath("/admin/templates");
  revalidatePath("/admin/templates/" + id);
  revalidatePath("/admin");
  redirect("/admin/templates/" + id + "?default=1");
}

export async function toggleTemplateStatusAction(formData: FormData) {
  await requireAdmin();

  const id = text(formData, "template_id");
  const template = await getCertificateTemplate(id);
  if (!template) throw new Error("Template tidak ditemukan.");
  if (template.is_default && template.status === "active") {
    throw new Error(
      "Template default tidak dapat diarsipkan. Tetapkan template lain sebagai default terlebih dahulu."
    );
  }

  const nextStatus = template.status === "active" ? "archived" : "active";
  await runQuery(
    "UPDATE certificate_templates SET status=$1, updated_at=NOW() WHERE id=$2",
    [nextStatus, id]
  );

  revalidatePath("/admin/templates");
  revalidatePath("/admin/templates/" + id);
  redirect("/admin/templates/" + id + "?status=1");
}

function parseParticipants(raw: string) {
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line, index) => !(index === 0 && /^nama[,;|]/i.test(line)))
    .map((line) => {
      const delimiter = line.includes("|") ? "|" : line.includes(";") ? ";" : ",";
      const [name = "", email = "", number = ""] = line
        .split(delimiter)
        .map((part) => part.trim());
      return { name, email, number };
    })
    .filter((row) => row.name);
}

export async function issueCertificatesAction(formData: FormData) {
  await requireAdmin();
  const eventId = text(formData, "event_id");
  const raw = text(formData, "participants");
  const event = await getEvent(eventId);
  if (!event) throw new Error("Kegiatan tidak ditemukan.");

  const template = event.template_id
    ? await getCertificateTemplate(event.template_id)
    : null;

  if (!template?.current_version_id) {
    throw new Error(
      "Template kegiatan belum memiliki versi aktif. Simpan template terlebih dahulu."
    );
  }

  const participants = parseParticipants(raw);
  if (!participants.length) throw new Error("Masukkan minimal satu peserta.");

  for (const participant of participants) {
    const id = crypto.randomUUID();
    const publicId = crypto.randomUUID().replace(/-/g, "");
    let number =
      participant.number ||
      autoCertificateNumber(event.certificate_prefix, event.event_date);

    if (!participant.number) {
      const existing = await runQuery(
        "SELECT id FROM certificates WHERE certificate_number=$1 LIMIT 1",
        [number]
      );
      if (existing.length) {
        number = autoCertificateNumber(event.certificate_prefix, event.event_date);
      }
    }

    await runQuery(
      "INSERT INTO certificates " +
        "(id, public_id, event_id, participant_name, participant_email, certificate_number, " +
        "custom_data, template_version_id, template_version_number) " +
        "VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9)",
      [
        id,
        publicId,
        eventId,
        participant.name,
        participant.email || null,
        number,
        "{}",
        template.current_version_id,
        template.current_version
      ]
    );
  }

  revalidatePath("/admin");
  revalidatePath("/admin/events/" + eventId);
  revalidatePath("/admin/templates/" + event.template_id);
}

export async function revokeCertificateAction(formData: FormData) {
  await requireAdmin();
  const certificateId = text(formData, "certificate_id");
  const eventId = text(formData, "event_id");
  const reason = text(formData, "reason") || "Dicabut oleh administrator";

  await runQuery(
    "UPDATE certificates SET status='revoked', revoked_at=NOW(), revoke_reason=$1 WHERE id=$2",
    [reason, certificateId]
  );

  revalidatePath("/admin/events/" + eventId);
  revalidatePath("/certificate/" + certificateId);
}

export async function restoreCertificateAction(formData: FormData) {
  await requireAdmin();
  const certificateId = text(formData, "certificate_id");
  const eventId = text(formData, "event_id");

  await runQuery(
    "UPDATE certificates SET status='valid', revoked_at=NULL, revoke_reason=NULL WHERE id=$1",
    [certificateId]
  );

  revalidatePath("/admin/events/" + eventId);
  revalidatePath("/certificate/" + certificateId);
}
