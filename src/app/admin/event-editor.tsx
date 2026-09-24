"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  formatDateId,
  type CertificateTemplateRecord,
  type EventRecord
} from "@/lib/types";
import { saveEventAction } from "./actions";
import TemplatePreview from "./template-preview";

export default function EventEditor({
  event,
  templates
}: {
  event?: EventRecord;
  templates: CertificateTemplateRecord[];
}) {
  const defaultTemplate =
    templates.find((template) => template.id === event?.template_id) ||
    templates.find((template) => template.is_default && template.status === "active") ||
    templates.find((template) => template.status === "active") ||
    templates[0];

  const [selectedTemplateId, setSelectedTemplateId] = useState(
    event?.template_id || defaultTemplate?.id || ""
  );
  const [meta, setMeta] = useState({
    title: event?.title ?? "",
    eventDate: event?.event_date ?? "",
    prefix: event?.certificate_prefix ?? "ITTS/CERT",
    organizer: event?.organizer ?? "Institut Teknologi Tangerang Selatan",
    signatory: event?.signatory ?? "",
    status: event?.status ?? ("active" as EventRecord["status"]),
    description: event?.description ?? ""
  });

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === selectedTemplateId),
    [selectedTemplateId, templates]
  );

  const activeTemplates = templates.filter(
    (template) =>
      template.status === "active" || template.id === event?.template_id
  );

  const previewMeta = {
    eventTitle: meta.title || "Nama Kegiatan ITTS",
    date: meta.eventDate ? formatDateId(meta.eventDate) : "Tanggal kegiatan",
    organizer: meta.organizer || "Institut Teknologi Tangerang Selatan",
    certificateNumber: (meta.prefix || "ITTS/CERT") + "/2026/0001"
  };

  return (
    <form action={saveEventAction} className="event-setup-workspace">
      <input type="hidden" name="id" value={event?.id ?? ""} />
      <input type="hidden" name="template_id" value={selectedTemplateId} />

      <div className="event-setup-main">
        <section className="card settings-card">
          <div className="section-heading">
            <span className="section-kicker">Informasi Kegiatan</span>
            <h2>Master kegiatan</h2>
            <p>
              Data ini akan digunakan secara otomatis ketika sertifikat diterbitkan kepada
              peserta.
            </p>
          </div>

          <div className="form-grid form-grid-roomy">
            <div className="form-group full">
              <label htmlFor="title">Nama kegiatan</label>
              <input
                className="input input-lg"
                id="title"
                name="title"
                value={meta.title}
                onChange={(e) =>
                  setMeta((current) => ({ ...current, title: e.target.value }))
                }
                placeholder="Contoh: Pelatihan Data Analytics 2026"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="event_date">Tanggal kegiatan</label>
              <input
                className="input"
                id="event_date"
                name="event_date"
                type="date"
                value={meta.eventDate}
                onChange={(e) =>
                  setMeta((current) => ({ ...current, eventDate: e.target.value }))
                }
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="status">Status kegiatan</label>
              <select
                className="select"
                id="status"
                name="status"
                value={meta.status}
                onChange={(e) =>
                  setMeta((current) => ({
                    ...current,
                    status: e.target.value as EventRecord["status"]
                  }))
                }
              >
                <option value="active">Aktif</option>
                <option value="draft">Draft</option>
                <option value="archived">Arsip</option>
              </select>
            </div>

            <div className="form-group full">
              <label htmlFor="organizer">Penyelenggara</label>
              <input
                className="input"
                id="organizer"
                name="organizer"
                value={meta.organizer}
                onChange={(e) =>
                  setMeta((current) => ({ ...current, organizer: e.target.value }))
                }
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="signatory">Penandatangan</label>
              <input
                className="input"
                id="signatory"
                name="signatory"
                value={meta.signatory}
                onChange={(e) =>
                  setMeta((current) => ({ ...current, signatory: e.target.value }))
                }
                placeholder="Contoh: Ketua Pelaksana / Dr. Nama Penandatangan"
              />
              <span className="help">
                Disarankan diisi agar area penandatangan pada template default tidak kosong.
              </span>
            </div>

            <div className="form-group">
              <label htmlFor="certificate_prefix">Prefix nomor sertifikat</label>
              <input
                className="input mono-input"
                id="certificate_prefix"
                name="certificate_prefix"
                value={meta.prefix}
                onChange={(e) =>
                  setMeta((current) => ({ ...current, prefix: e.target.value }))
                }
                placeholder="ITTS/TRAINING"
              />
            </div>

            <div className="form-group full">
              <label htmlFor="description">Deskripsi kegiatan</label>
              <textarea
                className="textarea"
                id="description"
                name="description"
                value={meta.description}
                onChange={(e) =>
                  setMeta((current) => ({ ...current, description: e.target.value }))
                }
                placeholder="Ringkasan singkat kegiatan (opsional)"
              />
            </div>
          </div>
        </section>

        <section className="card template-assignment-card">
          <div className="section-heading-row">
            <div>
              <span className="section-kicker">Template Assignment</span>
              <h2>Pilih template sertifikat</h2>
              <p>
                Template berasal dari Template Library dan dapat digunakan ulang oleh banyak
                kegiatan.
              </p>
            </div>
            <Link className="btn btn-secondary btn-small" href="/admin/templates">
              Buka Template Library
            </Link>
          </div>

          {activeTemplates.length ? (
            <div className="template-picker-grid">
              {activeTemplates.map((template) => {
                const selected = template.id === selectedTemplateId;
                return (
                  <button
                    key={template.id}
                    type="button"
                    className={"template-picker-card " + (selected ? "selected" : "")}
                    onClick={() => setSelectedTemplateId(template.id)}
                    aria-pressed={selected}
                  >
                    <TemplatePreview template={template} />
                    <span className="template-picker-copy">
                      <span className="template-picker-title">
                        <strong>{template.name}</strong>
                        {template.is_default ? (
                          <span className="badge badge-default">Default</span>
                        ) : null}
                        {template.id === "template-default-itts" ? (
                          <span className="badge badge-ready">Siap pakai</span>
                        ) : null}
                      </span>
                      <small>
                        {template.status === "archived"
                          ? "Template arsip · sedang digunakan kegiatan ini"
                          : (template.usage_count ?? 0) + " kegiatan menggunakan"}
                      </small>
                    </span>
                    <span className="template-radio" aria-hidden="true">
                      {selected ? "✓" : ""}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">T</div>
              <h3>Belum ada template aktif</h3>
              <p>Buat template sertifikat terlebih dahulu sebelum menyimpan kegiatan.</p>
              <Link className="btn btn-primary" href="/admin/templates/new">
                Buat template
              </Link>
            </div>
          )}
        </section>
      </div>

      <aside className="event-setup-aside">
        <div className="card event-preview-card">
          <div className="studio-panel-head">
            <div>
              <span className="section-kicker">Preview</span>
              <h3>Sertifikat kegiatan</h3>
            </div>
            {selectedTemplate ? (
              <span className="canvas-chip">{selectedTemplate.name}</span>
            ) : null}
          </div>

          {selectedTemplate ? (
            <>
              <TemplatePreview template={selectedTemplate} className="event-template-preview" />
              <div className="event-preview-meta">
                <div>
                  <span>Kegiatan</span>
                  <strong>{previewMeta.eventTitle}</strong>
                </div>
                <div>
                  <span>Tanggal</span>
                  <strong>{previewMeta.date}</strong>
                </div>
                <div>
                  <span>Contoh nomor</span>
                  <code>{previewMeta.certificateNumber}</code>
                </div>
              </div>
              <Link
                className="text-link"
                href={"/admin/templates/" + selectedTemplate.id}
              >
                Edit master template →
              </Link>
            </>
          ) : (
            <p className="muted small">Pilih template untuk menampilkan preview.</p>
          )}
        </div>

        <div className="card event-save-card">
          <span className="section-kicker">{event ? "Update" : "Create"}</span>
          <h3>{event ? "Simpan perubahan kegiatan" : "Buat kegiatan"}</h3>
          <p>
            Template hanya direferensikan dari library. Perubahan desain master akan berlaku
            untuk kegiatan yang menggunakannya.
          </p>
          <button
            className="btn btn-primary"
            type="submit"
            disabled={!selectedTemplateId}
          >
            {event ? "Simpan perubahan" : "Buat kegiatan"}
          </button>
        </div>
      </aside>
    </form>
  );
}
