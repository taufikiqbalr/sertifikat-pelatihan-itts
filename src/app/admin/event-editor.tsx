"use client";

import { useMemo, useState, type PointerEvent } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  DEFAULT_TEMPLATE_CONFIG,
  formatDateId,
  renderText,
  type EventRecord,
  type TemplateConfig,
  type TemplateField
} from "@/lib/types";
import { saveEventAction } from "./actions";

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

export default function EventEditor({ event }: { event?: EventRecord }) {
  const [activePanel, setActivePanel] = useState<"event" | "template">(
    event ? "template" : "event"
  );
  const [config, setConfig] = useState<TemplateConfig>(
    event?.template_config ?? cloneDefault()
  );
  const [imageUrl, setImageUrl] = useState(event?.template_image_url ?? "");
  const [uploading, setUploading] = useState(false);
  const [selected, setSelected] = useState<string>(
    event?.template_config?.fields?.[0]?.id ?? DEFAULT_TEMPLATE_CONFIG.fields[0].id
  );
  const [drag, setDrag] = useState<{ type: "field" | "qr"; id?: string } | null>(null);
  const [meta, setMeta] = useState({
    title: event?.title ?? "",
    eventDate: event?.event_date ?? "",
    prefix: event?.certificate_prefix ?? "ITTS/CERT",
    organizer: event?.organizer ?? "Institut Teknologi Tangerang Selatan",
    signatory: event?.signatory ?? "",
    status: event?.status ?? ("active" as EventRecord["status"]),
    description: event?.description ?? ""
  });

  const previewValues = useMemo(
    () => ({
      participant_name: "Nama Peserta",
      certificate_number: (meta.prefix || "ITTS/CERT") + "/2026/0001",
      event_title: meta.title || "Webinar & Pelatihan ITTS",
      event_date: meta.eventDate ? formatDateId(meta.eventDate) : "24 September 2026",
      organizer: meta.organizer || "Institut Teknologi Tangerang Selatan",
      signatory: meta.signatory || "Ketua Pelaksana"
    }),
    [meta]
  );

  const selectedField = config.fields.find((field) => field.id === selected);

  function updateField(id: string, patch: Partial<TemplateField>) {
    setConfig((current) => ({
      ...current,
      fields: current.fields.map((field) =>
        field.id === id ? { ...field, ...patch } : field
      )
    }));
  }

  function removeField(id: string) {
    setConfig((current) => ({
      ...current,
      fields: current.fields.filter((field) => field.id !== id)
    }));
    setSelected((current) => {
      if (current !== id) return current;
      return config.fields.find((field) => field.id !== id)?.id ?? "__qr__";
    });
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
          y: 50,
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
    <form action={saveEventAction} className="certificate-workspace">
      <input type="hidden" name="id" value={event?.id ?? ""} />
      <input type="hidden" name="template_image_url" value={imageUrl} />
      <input type="hidden" name="template_config" value={JSON.stringify(config)} />

      <div className="workspace-toolbar">
        <div className="workspace-tabs" role="tablist" aria-label="Pengaturan kegiatan">
          <button
            type="button"
            role="tab"
            aria-selected={activePanel === "event"}
            className={activePanel === "event" ? "active" : ""}
            onClick={() => setActivePanel("event")}
          >
            <span>1</span>
            Informasi Kegiatan
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activePanel === "template"}
            className={activePanel === "template" ? "active" : ""}
            onClick={() => setActivePanel("template")}
          >
            <span>2</span>
            Template Sertifikat
          </button>
        </div>

        <button className="btn btn-primary workspace-save" type="submit">
          {event ? "Simpan perubahan" : "Buat kegiatan"}
        </button>
      </div>

      <section
        className={"workspace-panel " + (activePanel === "event" ? "" : "is-hidden")}
        aria-hidden={activePanel !== "event"}
      >
        <div className="settings-layout">
          <div className="card settings-card">
            <div className="section-heading">
              <span className="section-kicker">Master kegiatan</span>
              <h2>Informasi utama</h2>
              <p>Informasi ini menjadi sumber data untuk seluruh sertifikat yang diterbitkan.</p>
            </div>

            <div className="form-grid form-grid-roomy">
              <div className="form-group full">
                <label htmlFor="title">Nama kegiatan</label>
                <input
                  className="input input-lg"
                  id="title"
                  name="title"
                  value={meta.title}
                  onChange={(e) => setMeta((current) => ({ ...current, title: e.target.value }))}
                  placeholder="Contoh: Pelatihan Data Analytics 2026"
                  required
                />
                <span className="help">Gunakan nama resmi kegiatan sebagaimana akan tampil pada sertifikat.</span>
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
                  placeholder="Nama atau jabatan"
                />
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
          </div>

          <aside className="card settings-aside">
            <div className="section-heading compact">
              <span className="section-kicker">Preview data</span>
              <h3>Yang akan tampil</h3>
            </div>
            <div className="preview-data-list">
              <div>
                <span>Kegiatan</span>
                <strong>{previewValues.event_title}</strong>
              </div>
              <div>
                <span>Tanggal</span>
                <strong>{previewValues.event_date}</strong>
              </div>
              <div>
                <span>Penyelenggara</span>
                <strong>{previewValues.organizer}</strong>
              </div>
              <div>
                <span>Contoh nomor</span>
                <code>{previewValues.certificate_number}</code>
              </div>
            </div>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setActivePanel("template")}
            >
              Lanjut atur template →
            </button>
          </aside>
        </div>
      </section>

      <section
        className={"workspace-panel " + (activePanel === "template" ? "" : "is-hidden")}
        aria-hidden={activePanel !== "template"}
      >
        <div className="template-studio">
          <div className="studio-main">
            <div className="studio-titlebar">
              <div>
                <span className="section-kicker">Live preview</span>
                <h2>Desain Sertifikat</h2>
                <p>Klik elemen pada sertifikat atau daftar elemen, kemudian atur propertinya.</p>
              </div>
              <span className="canvas-chip">
                {imageUrl ? "Template custom" : "Template default ITTS"}
              </span>
            </div>

            <div className="canvas-stage">
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
                  .map((field) => (
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
                          field.fontSize / 11.23 +
                          "vw, " +
                          field.fontSize +
                          "px)",
                        fontWeight: field.fontWeight,
                        color: field.color,
                        textAlign: field.align,
                        fontStyle: field.italic ? "italic" : "normal"
                      }}
                    >
                      {renderText(field.template, previewValues)}
                    </div>
                  ))}

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
              Seret elemen langsung pada sertifikat untuk mengubah posisi. Gunakan inspector
              untuk presisi ukuran, warna, dan alignment.
            </div>
          </div>

          <aside className="studio-sidebar">
            <div className="studio-panel">
              <div className="studio-panel-head">
                <div>
                  <span className="section-kicker">Background</span>
                  <h3>Template gambar</h3>
                </div>
                {imageUrl ? (
                  <button
                    className="text-button"
                    type="button"
                    onClick={() => setImageUrl("")}
                  >
                    Reset default
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
                <strong>{uploading ? "Mengunggah template..." : "Upload template baru"}</strong>
                <small>PNG, JPG, atau WebP · maksimal 4 MB</small>
              </label>
            </div>

            <div className="studio-panel">
              <div className="studio-panel-head">
                <div>
                  <span className="section-kicker">Layers</span>
                  <h3>Elemen sertifikat</h3>
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
                      aria-label={field.hidden ? "Tampilkan elemen" : "Sembunyikan elemen"}
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
                    <small>{config.qr.hidden ? "Disembunyikan" : "Tautan verifikasi sertifikat"}</small>
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
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.stopPropagation();
                        setConfig((current) => ({
                          ...current,
                          qr: { ...current.qr, hidden: !current.qr.hidden }
                        }));
                      }
                    }}
                  >
                    {config.qr.hidden ? "○" : "●"}
                  </span>
                </button>
              </div>
            </div>

            <div className="studio-panel inspector-panel">
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
                      <label>Ukuran font</label>
                      <input
                        className="input"
                        type="number"
                        value={selectedField.fontSize}
                        onChange={(e) =>
                          updateField(selectedField.id, {
                            fontSize: Number(e.target.value)
                          })
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
                        step="0.5"
                        min="4"
                        max="30"
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
                  <p className="help">
                    QR Code otomatis mengarah ke halaman validasi publik untuk masing-masing
                    sertifikat.
                  </p>
                </div>
              ) : (
                <p className="muted small">Pilih elemen pada daftar layer untuk mengedit.</p>
              )}
            </div>

            <button
              className="btn btn-secondary"
              type="button"
              onClick={() => {
                setConfig(cloneDefault());
                setSelected(DEFAULT_TEMPLATE_CONFIG.fields[0].id);
              }}
            >
              Reset seluruh layout
            </button>
          </aside>
        </div>
      </section>
    </form>
  );
}
