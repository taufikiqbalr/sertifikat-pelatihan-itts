"use server";

import crypto from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { clearAdminSession, requireAdmin } from "@/lib/auth";
import { getEvent, runQuery } from "@/lib/db";
import { DEFAULT_TEMPLATE_CONFIG, slugify, type TemplateConfig } from "@/lib/types";

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
  const templateImageUrl = text(formData, "template_image_url");
  const status = text(formData, "status") || "active";
  const config = parseConfig(text(formData, "template_config"));

  if (!title || !eventDate || !organizer) {
    throw new Error("Nama kegiatan, tanggal, dan penyelenggara wajib diisi.");
  }

  if (existingId) {
    await runQuery(
      "UPDATE events SET title=$1, event_date=$2, organizer=$3, signatory=$4, description=$5, certificate_prefix=$6, template_image_url=$7, template_config=$8::jsonb, status=$9, updated_at=NOW() WHERE id=$10",
      [
        title,
        eventDate,
        organizer,
        signatory,
        description || null,
        prefix,
        templateImageUrl || null,
        JSON.stringify(config),
        status,
        existingId
      ]
    );
    revalidatePath("/admin");
    revalidatePath("/admin/events/" + existingId);
    redirect("/admin/events/" + existingId + "?saved=1");
  }

  const id = crypto.randomUUID();
  let slug = slugify(title) || "kegiatan";
  const duplicate = await runQuery("SELECT id FROM events WHERE slug=$1 LIMIT 1", [slug]);
  if (duplicate.length) slug += "-" + id.slice(0, 6);

  await runQuery(
    "INSERT INTO events (id, slug, title, event_date, organizer, signatory, description, certificate_prefix, template_image_url, template_config, status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11)",
    [
      id,
      slug,
      title,
      eventDate,
      organizer,
      signatory,
      description || null,
      prefix,
      templateImageUrl || null,
      JSON.stringify(config),
      status
    ]
  );

  revalidatePath("/admin");
  redirect("/admin/events/" + id + "?created=1");
}

function parseParticipants(raw: string) {
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line, index) => !(index === 0 && /^nama[,;|]/i.test(line)))
    .map((line) => {
      const delimiter = line.includes("|") ? "|" : line.includes(";") ? ";" : ",";
      const [name = "", email = "", number = ""] = line.split(delimiter).map((part) => part.trim());
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

  const participants = parseParticipants(raw);
  if (!participants.length) throw new Error("Masukkan minimal satu peserta.");

  for (const participant of participants) {
    const id = crypto.randomUUID();
    const publicId = crypto.randomUUID().replace(/-/g, "");
    let number = participant.number || autoCertificateNumber(event.certificate_prefix, event.event_date);

    if (!participant.number) {
      const existing = await runQuery("SELECT id FROM certificates WHERE certificate_number=$1 LIMIT 1", [number]);
      if (existing.length) number = autoCertificateNumber(event.certificate_prefix, event.event_date);
    }

    await runQuery(
      "INSERT INTO certificates (id, public_id, event_id, participant_name, participant_email, certificate_number, custom_data) VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb)",
      [id, publicId, eventId, participant.name, participant.email || null, number, "{}"]
    );
  }

  revalidatePath("/admin");
  revalidatePath("/admin/events/" + eventId);
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
