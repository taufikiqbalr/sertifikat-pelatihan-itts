"use client";

import { useMemo, useState, type PointerEvent } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  DEFAULT_TEMPLATE_CONFIG,
  DEFAULT_TEMPLATE_IMAGE_URL,
  renderText,
  resolveTemplateFontSize,
  type CertificateTemplateRecord,
  type TemplateConfig,
  type TemplateField
} from "@/lib/types";
import { saveTemplateAction } from "./actions";

const cloneDefault = () =>
  JSON.parse(JSON.stringify(DEFAULT_TEMPLATE_CONFIG)) as TemplateConfig;

const fieldLabels: Record<string, string> = {
  "event-title": "Nama kegiatan",
  "participant-name": "Nama peserta",
  "certificate-number": "Nomor sertifikat",
  "event-date": "Tanggal kegiatan",
  organizer: "Penyelenggara",
  signatory: "Penandatangan"
};

const previewValues = {
  participant_name: "Nama Peserta",
  certificate_number: "ITTS/CERT/2026/0001",
  event_title: "Pelatihan Data & Teknologi ITTS",
  event_date: "24 September 2026",
  organizer: "Institut Teknologi Tangerang Selatan",
  signatory: "Ketua Pelaksana"
};

export default function TemplateEditor({
  template
}: {
  template?: CertificateTemplateRecord;
}) {
  const [config, setConfig] = useState<TemplateConfig>(
    template?.template_config ?? cloneDefault()
  );
  const [imageUrl, setImageUrl] = useState(
    template ? template.template_image_url ?? "" : DEFAULT_TEMPLATE_IMAGE_URL
  );
  const [uploading, setUploading] = useState(false);
  const [selected, setSelected] = useState(
    template?.template_config.fields[0]?.id ?? DEFAULT_TEMPLATE_CONFIG.fields[0].id
  );
  const [drag, setDrag] = useState<{ type: "field" | "qr"; id?: string } | null>(null);
  const [meta, setMeta] = useState({
    name: template?.name ?? "",
    description: template?.description ?? "",
    status: template?.status ?? ("active" as CertificateTemplateRecord["status"]),
    isDefault: template?.is_default ?? false,
    versionNote: ""
  });

  const selectedField = useMemo(
    () => config.fields.find((field) => field.id === selected),
    [config.fields, selected]
  );

  function updateField(id: string, patch: Partial<TemplateField>) {
    setConfig((current) => ({
      ...current,
      fields: current.fields.map((field) =>
        field.id === id ? { ...field, ...patch } : field
      )
    }));
  }

  function addField() {
    const id = "field-" + Date.now();
    setConfig((current) => ({
      ...current,
      fields: [
        ...current.fields,
        {
          id,
          template: "Teks tambahan",
          x: 50,
          y: 52,
          width: 60,
          fontSize: 18,
          fontWeight: 500,
          color: "#1f2937",
          align: "center"
        }
      ]
    }));
    setSelected(id);
  }

  function removeField(id: string) {
    const fallback = config.fields.find((field) => field.id !== id)?.id ?? "__qr__";
    setConfig((current) => ({
      ...current,
      fields: current.fields.filter((field) => field.id !== id)
    }));
    setSelected(fallback);
  }

  function movePointer(event: PointerEvent<HTMLDivElement>) {
    if (!drag) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = Math.min(98, Math.max(2, ((event.clientX - rect.left) / rect.width) * 100));
    const y = Math.min(98, Math.max(2, ((event.clientY - rect.top) / rect.height) * 100));

    if (drag.type === "qr") {
      setConfig((current) => ({ ...current, qr: { ...current.qr, x, y } }));
    } else if (drag.id) {
      updateField(drag.id, { x, y });
    }
  }

  async function uploadTemplate(file?: File) {
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      alert("Ukuran gambar maksimal 4 MB.");
      return;
    }

    setUploading(true);
    try {
      const data = new FormData();
      data.set("file", file);
      const response = await fetch("/api/upload", { method: "POST", body: data });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Upload gagal");
      setImageUrl(result.url);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Upload gagal");
    } finally {
      setUploading(false);
    }
  }

  return (
    <form action={saveTemplateAction} className="certificate-workspace template-editor-form">
      <input type="hidden" name="id" value={template?.id ?? ""} />
      <input type="hidden" name="template_image_url" value={imageUrl} />
      <input type="hidden" name="template_config" value={JSON.stringify(config)} />
      <input type="hidden" name="is_default" value={meta.isDefault ? "true" : "false"} />

      <div className="workspace-toolbar template-editor-toolbar">
        <div>
          <span className="section-kicker">Template master</span>
          <strong>{template ? "Edit template" : "Template baru"}</strong>
        </div>
        <div className="version-save-actions">
          {template ? (
            <span className="version-current-chip">
              v{template.current_version} aktif · simpan menjadi v{template.current_version + 1}
            </span>
          ) : (
            <span className="version-current-chip">akan dibuat sebagai v1</span>
          )}
          <button className="btn btn-primary" type="submit">
            {template ? "Simpan versi baru" : "Buat template"}
          </button>
        </div>
      </div>

      <div className="template-editor-layout">
        <aside className="template-meta-sidebar">
          <section className="studio-panel">
            <div className="studio-panel-head">
              <div>
                <span className="section-kicker">Identitas</span>
                <h3>Informasi template</h3>
              </div>
            </div>

            <div className="inspector-form">
              <div className="form-group">
                <label htmlFor="name">Nama template</label>
                <input
                  className="input"
                  id="name"
                  name="name"
                  value={meta.name}
                  onChange={(e) =>
                    setMeta((current) => ({ ...current, name: e.target.value }))
                  }
                  placeholder="Contoh: Sertifikat Webinar Landscape"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="description">Deskripsi</label>
                <textarea
                  className="textarea template-description"
                  id="description"
                  name="description"
                  value={meta.description}
                  onChange={(e) =>
                    setMeta((current) => ({ ...current, description: e.target.value }))
                  }
                  placeholder="Kapan template ini sebaiknya digunakan?"
                />
              </div>

              <div className="form-group">
                <label htmlFor="status">Status</label>
                <select
                  className="select"
                  id="status"
                  name="status"
                  value={meta.status}
                  disabled={meta.isDefault}
                  onChange={(e) =>
                    setMeta((current) => ({
                      ...current,
                      status: e.target.value as CertificateTemplateRecord["status"]
                    }))
                  }
                >
                  <option value="active">Aktif</option>
                  <option value="archived">Arsip</option>
                </select>
                {meta.isDefault ? (
                  <span className="help">Template default harus tetap aktif.</span>
                ) : null}
              </div>

              <div className="form-group">
                <label htmlFor="version_note">Catatan versi</label>
                <input
                  className="input"
                  id="version_note"
                  name="version_note"
                  value={meta.versionNote}
                  onChange={(e) =>
                    setMeta((current) => ({ ...current, versionNote: e.target.value }))
                  }
                  placeholder={
                    template
                      ? "Contoh: Perbaikan posisi QR dan ukuran nama peserta"
                      : "Contoh: Versi awal untuk sertifikat pelatihan"
                  }
                />
                <span className="help">
                  Setiap simpan menghasilkan versi immutable baru untuk kebutuhan audit.
                </span>
              </div>

              <label className="default-switch">
                <input
                  type="checkbox"
                  checked={meta.isDefault}
                  onChange={(e) =>
                    setMeta((current) => ({
                      ...current,
                      isDefault: e.target.checked,
                      status: e.target.checked ? "active" : current.status
                    }))
                  }
                />
                <span>
                  <strong>Jadikan template default</strong>
                  <small>Otomatis dipilih saat membuat kegiatan baru.</small>
                </span>
              </label>
            </div>
          </section>

          <section className="studio-panel">
            <div className="studio-panel-head">
              <div>
                <span className="section-kicker">Background</span>
                <h3>Gambar sertifikat</h3>
              </div>
              {imageUrl !== DEFAULT_TEMPLATE_IMAGE_URL ? (
                <button
                  className="text-button"
                  type="button"
                  onClick={() => setImageUrl(DEFAULT_TEMPLATE_IMAGE_URL)}
                >
                  Gunakan default
                </button>
              ) : null}
            </div>

            <label className={"upload-dropzone " + (uploading ? "is-loading" : "")}>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(e) => uploadTemplate(e.target.files?.[0])}
                disabled={uploading}
              />
              <span className="upload-icon">{uploading ? "…" : "↑"}</span>
              <strong>{uploading ? "Mengunggah..." : "Upload background"}</strong>
              <small>PNG, JPG, atau WebP · maksimal 4 MB</small>
            </label>
          </section>
        </aside>

        <section className="studio-main template-main-canvas">
          <div className="studio-titlebar">
            <div>
              <span className="section-kicker">Designer</span>
              <h2>Live Preview</h2>
              <p>Seret elemen langsung pada sertifikat, lalu sempurnakan melalui inspector.</p>
            </div>
            <span className="canvas-chip">{imageUrl ? "Custom" : "Default ITTS"}</span>
          </div>

          <div className="canvas-stage template-canvas-stage">
            <div
              className="certificate-canvas studio-canvas"
              onPointerMove={movePointer}
              onPointerUp={() => setDrag(null)}
              onPointerLeave={() => setDrag(null)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl || "/default-certificate.svg"}
                alt="Preview template sertifikat"
              />

              {config.fields
                .filter((field) => !field.hidden)
                .map((field) => {
                  const rendered = renderText(field.template, previewValues);
                  const fittedSize = resolveTemplateFontSize(field, rendered);

                  return (
                  <div
                    key={field.id}
                    className={"cert-field " + (selected === field.id ? "selected" : "")}
                    onPointerDown={(e) => {
                      e.preventDefault();
                      setSelected(field.id);
                      setDrag({ type: "field", id: field.id });
                      e.currentTarget.setPointerCapture?.(e.pointerId);
                    }}
                    style={{
                      left: field.x + "%",
                      top: field.y + "%",
                      width: field.width + "%",
                      fontSize:
                        "clamp(8px, " +
                        fittedSize / 11.23 +
                        "vw, " +
                        fittedSize +
                        "px)",
                      fontWeight: field.fontWeight,
                      color: field.color,
                      textAlign: field.align,
                      fontStyle: field.italic ? "italic" : "normal",
                      lineHeight: field.lineHeight ?? 1.12,
                      letterSpacing: field.letterSpacing
                        ? field.letterSpacing + "px"
                        : undefined,
                      overflowWrap: "break-word"
                    }}
                  >
                    {rendered}
                  </div>
                  );
                })}

              {!config.qr.hidden ? (
                <div
                  className={"cert-qr " + (selected === "__qr__" ? "selected" : "")}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    setSelected("__qr__");
                    setDrag({ type: "qr" });
                    e.currentTarget.setPointerCapture?.(e.pointerId);
                  }}
                  style={{
                    left: config.qr.x + "%",
                    top: config.qr.y + "%",
                    width: config.qr.size + "%"
                  }}
                >
                  <QRCodeSVG
                    value="https://sertifikat.itts.ac.id/verify/DEMO"
                    size={120}
                    style={{ width: "100%", height: "auto", display: "block" }}
                  />
                </div>
              ) : null}
            </div>
          </div>

          <div className="studio-hint">
            <span>Tip</span>
            Gunakan placeholder agar satu template dapat digunakan ulang untuk banyak kegiatan
            dan peserta.
          </div>
        </section>

        <aside className="studio-sidebar template-inspector-sidebar">
          <section className="studio-panel">
            <div className="studio-panel-head">
              <div>
                <span className="section-kicker">Layers</span>
                <h3>Elemen</h3>
              </div>
              <button className="text-button" type="button" onClick={addField}>
                + Teks
              </button>
            </div>

            <div className="layer-list">
              {config.fields.map((field) => (
                <button
                  type="button"
                  className={"layer-item " + (selected === field.id ? "active" : "")}
                  key={field.id}
                  onClick={() => setSelected(field.id)}
                >
                  <span className="layer-icon">T</span>
                  <span className="layer-copy">
                    <strong>{fieldLabels[field.id] ?? "Teks tambahan"}</strong>
                    <small>{field.hidden ? "Disembunyikan" : field.template}</small>
                  </span>
                  <span
                    className="layer-visibility"
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      updateField(field.id, { hidden: !field.hidden });
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.stopPropagation();
                        updateField(field.id, { hidden: !field.hidden });
                      }
                    }}
                  >
                    {field.hidden ? "○" : "●"}
                  </span>
                </button>
              ))}

              <button
                type="button"
                className={"layer-item " + (selected === "__qr__" ? "active" : "")}
                onClick={() => setSelected("__qr__")}
              >
                <span className="layer-icon qr">QR</span>
                <span className="layer-copy">
                  <strong>QR validasi</strong>
                  <small>{config.qr.hidden ? "Disembunyikan" : "Verifikasi publik"}</small>
                </span>
                <span
                  className="layer-visibility"
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfig((current) => ({
                      ...current,
                      qr: { ...current.qr, hidden: !current.qr.hidden }
                    }));
                  }}
                >
                  {config.qr.hidden ? "○" : "●"}
                </span>
              </button>
            </div>
          </section>

          <section className="studio-panel inspector-panel">
            <div className="studio-panel-head">
              <div>
                <span className="section-kicker">Inspector</span>
                <h3>
                  {selected === "__qr__"
                    ? "QR Code"
                    : selectedField
                      ? fieldLabels[selectedField.id] ?? "Teks tambahan"
                      : "Pilih elemen"}
                </h3>
              </div>
              {selectedField && !fieldLabels[selectedField.id] ? (
                <button
                  className="text-button danger"
                  type="button"
                  onClick={() => removeField(selectedField.id)}
                >
                  Hapus
                </button>
              ) : null}
            </div>

            {selectedField ? (
              <div className="inspector-form">
                <div className="form-group">
                  <label>Teks / placeholder</label>
                  <input
                    className="input"
                    value={selectedField.template}
                    onChange={(e) =>
                      updateField(selectedField.id, { template: e.target.value })
                    }
                  />
                </div>

                <div className="inspector-grid">
                  <div className="form-group">
                    <label>X (%)</label>
                    <input
                      className="input"
                      type="number"
                      step="0.5"
                      value={selectedField.x}
                      onChange={(e) =>
                        updateField(selectedField.id, { x: Number(e.target.value) })
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label>Y (%)</label>
                    <input
                      className="input"
                      type="number"
                      step="0.5"
                      value={selectedField.y}
                      onChange={(e) =>
                        updateField(selectedField.id, { y: Number(e.target.value) })
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label>Lebar (%)</label>
                    <input
                      className="input"
                      type="number"
                      value={selectedField.width}
                      onChange={(e) =>
                        updateField(selectedField.id, { width: Number(e.target.value) })
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label>Font (px)</label>
                    <input
                      className="input"
                      type="number"
                      value={selectedField.fontSize}
                      onChange={(e) =>
                        updateField(selectedField.id, { fontSize: Number(e.target.value) })
                      }
                    />
                  </div>
                </div>

                <div className="inspector-grid">
                  <div className="form-group">
                    <label>Bobot</label>
                    <select
                      className="select"
                      value={selectedField.fontWeight}
                      onChange={(e) =>
                        updateField(selectedField.id, {
                          fontWeight: Number(e.target.value)
                        })
                      }
                    >
                      <option value="400">Regular</option>
                      <option value="500">Medium</option>
                      <option value="700">Bold</option>
                      <option value="800">Extra Bold</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Alignment</label>
                    <select
                      className="select"
                      value={selectedField.align}
                      onChange={(e) =>
                        updateField(selectedField.id, {
                          align: e.target.value as TemplateField["align"]
                        })
                      }
                    >
                      <option value="left">Kiri</option>
                      <option value="center">Tengah</option>
                      <option value="right">Kanan</option>
                    </select>
                  </div>
                </div>

                <div className="inspector-grid">
                  <div className="form-group">
                    <label>Warna</label>
                    <div className="color-control">
                      <input
                        type="color"
                        value={selectedField.color}
                        onChange={(e) =>
                          updateField(selectedField.id, { color: e.target.value })
                        }
                      />
                      <code>{selectedField.color.toUpperCase()}</code>
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Gaya</label>
                    <button
                      className={"style-toggle " + (selectedField.italic ? "active" : "")}
                      type="button"
                      onClick={() =>
                        updateField(selectedField.id, {
                          italic: !selectedField.italic
                        })
                      }
                    >
                      I &nbsp; Italic
                    </button>
                  </div>
                </div>
              </div>
            ) : selected === "__qr__" ? (
              <div className="inspector-form">
                <div className="inspector-grid">
                  <div className="form-group">
                    <label>X (%)</label>
                    <input
                      className="input"
                      type="number"
                      step="0.5"
                      value={config.qr.x}
                      onChange={(e) =>
                        setConfig((current) => ({
                          ...current,
                          qr: { ...current.qr, x: Number(e.target.value) }
                        }))
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label>Y (%)</label>
                    <input
                      className="input"
                      type="number"
                      step="0.5"
                      value={config.qr.y}
                      onChange={(e) =>
                        setConfig((current) => ({
                          ...current,
                          qr: { ...current.qr, y: Number(e.target.value) }
                        }))
                      }
                    />
                  </div>
                  <div className="form-group full">
                    <label>Ukuran (%)</label>
                    <input
                      className="input"
                      type="number"
                      min="4"
                      max="30"
                      step="0.5"
                      value={config.qr.size}
                      onChange={(e) =>
                        setConfig((current) => ({
                          ...current,
                          qr: { ...current.qr, size: Number(e.target.value) }
                        }))
                      }
                    />
                  </div>
                </div>
              </div>
            ) : null}
          </section>

          <section className="studio-panel placeholder-guide">
            <span className="section-kicker">Placeholder</span>
            <div className="placeholder-list">
              <code>{"{{participant_name}}"}</code>
              <code>{"{{certificate_number}}"}</code>
              <code>{"{{event_title}}"}</code>
              <code>{"{{event_date}}"}</code>
              <code>{"{{organizer}}"}</code>
              <code>{"{{signatory}}"}</code>
            </div>
          </section>

          <button
            className="btn btn-secondary"
            type="button"
            onClick={() => {
              setConfig(cloneDefault());
              setImageUrl(DEFAULT_TEMPLATE_IMAGE_URL);
              setSelected(DEFAULT_TEMPLATE_CONFIG.fields[0].id);
            }}
          >
            Reset layout default
          </button>
        </aside>
      </div>
    </form>
  );
}
