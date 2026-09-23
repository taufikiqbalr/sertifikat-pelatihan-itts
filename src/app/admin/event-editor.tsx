"use client";

import { useMemo, useState, type PointerEvent } from "react";
import { QRCodeSVG } from "qrcode.react";
import { DEFAULT_TEMPLATE_CONFIG, formatDateId, renderText, type EventRecord, type TemplateConfig, type TemplateField } from "@/lib/types";
import { saveEventAction } from "./actions";

const cloneDefault = () => JSON.parse(JSON.stringify(DEFAULT_TEMPLATE_CONFIG)) as TemplateConfig;

export default function EventEditor({ event }: { event?: EventRecord }) {
  const [config, setConfig] = useState<TemplateConfig>(event?.template_config ?? cloneDefault());
  const [imageUrl, setImageUrl] = useState(event?.template_image_url ?? "");
  const [uploading, setUploading] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [drag, setDrag] = useState<{ type: "field" | "qr"; id?: string } | null>(null);

  const previewValues = useMemo(() => ({
    participant_name: "Nama Peserta",
    certificate_number: event?.certificate_prefix ? event.certificate_prefix + "/2026/0001" : "ITTS/CERT/2026/0001",
    event_title: event?.title || "Webinar & Pelatihan ITTS",
    event_date: event?.event_date ? formatDateId(event.event_date) : "23 September 2026",
    organizer: event?.organizer || "Institut Teknologi Tangerang Selatan",
    signatory: event?.signatory || "Ketua Pelaksana"
  }), [event]);

  function updateField(id: string, patch: Partial<TemplateField>) {
    setConfig((current) => ({
      ...current,
      fields: current.fields.map((field) => field.id === id ? { ...field, ...patch } : field)
    }));
  }

  function removeField(id: string) {
    setConfig((current) => ({ ...current, fields: current.fields.filter((field) => field.id !== id) }));
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

  function movePointer(e: PointerEvent<HTMLDivElement>) {
    if (!drag) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.min(98, Math.max(2, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.min(98, Math.max(2, ((e.clientY - rect.top) / rect.height) * 100));
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
    <section className="editor-layout">
      <div className="editor-preview">
        <div
          className="certificate-canvas"
          onPointerMove={movePointer}
          onPointerUp={() => setDrag(null)}
          onPointerLeave={() => setDrag(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl || "/default-certificate.svg"} alt="Preview template sertifikat" />
          {config.fields.filter((field) => !field.hidden).map((field) => (
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
                fontSize: "clamp(8px, " + (field.fontSize / 11.23) + "vw, " + field.fontSize + "px)",
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
              className="cert-qr"
              onPointerDown={(e) => {
                e.preventDefault();
                setSelected("__qr__");
                setDrag({ type: "qr" });
                e.currentTarget.setPointerCapture?.(e.pointerId);
              }}
              style={{ left: config.qr.x + "%", top: config.qr.y + "%", width: config.qr.size + "%" }}
            >
              <QRCodeSVG value="https://sertifikat.itts.ac.id/verify/DEMO" size={120} style={{ width: "100%", height: "auto", display: "block" }} />
            </div>
          ) : null}
        </div>
        <p className="help">Tip: klik dan seret teks atau QR Code pada preview untuk mengatur posisinya.</p>
      </div>

      <div className="stack">
        <form action={saveEventAction} className="card stack">
          <div className="card-header"><div><h2 style={{ marginBottom: 5 }}>Master Kegiatan</h2><span className="muted small">Data ini akan dipakai pada seluruh sertifikat kegiatan.</span></div></div>
          <input type="hidden" name="id" value={event?.id ?? ""} />
          <input type="hidden" name="template_image_url" value={imageUrl} />
          <input type="hidden" name="template_config" value={JSON.stringify(config)} />

          <div className="form-grid">
            <div className="form-group full">
              <label htmlFor="title">Nama kegiatan</label>
              <input className="input" id="title" name="title" defaultValue={event?.title ?? ""} placeholder="Contoh: Pelatihan Data Analytics 2026" required />
            </div>
            <div className="form-group">
              <label htmlFor="event_date">Tanggal kegiatan</label>
              <input className="input" id="event_date" name="event_date" type="date" defaultValue={event?.event_date ?? ""} required />
            </div>
            <div className="form-group">
              <label htmlFor="certificate_prefix">Prefix nomor</label>
              <input className="input" id="certificate_prefix" name="certificate_prefix" defaultValue={event?.certificate_prefix ?? "ITTS/CERT"} placeholder="ITTS/TRAINING" />
            </div>
            <div className="form-group">
              <label htmlFor="organizer">Penyelenggara</label>
              <input className="input" id="organizer" name="organizer" defaultValue={event?.organizer ?? "Institut Teknologi Tangerang Selatan"} required />
            </div>
            <div className="form-group">
              <label htmlFor="signatory">Nama penandatangan</label>
              <input className="input" id="signatory" name="signatory" defaultValue={event?.signatory ?? ""} placeholder="Nama / Jabatan" />
            </div>
            <div className="form-group">
              <label htmlFor="status">Status</label>
              <select className="select" id="status" name="status" defaultValue={event?.status ?? "active"}>
                <option value="active">Aktif</option>
                <option value="draft">Draft</option>
                <option value="archived">Arsip</option>
              </select>
            </div>
            <div className="form-group full">
              <label htmlFor="description">Deskripsi (opsional)</label>
              <textarea className="textarea" id="description" name="description" defaultValue={event?.description ?? ""} />
            </div>
          </div>

          <div className="form-group">
            <label>Gambar template sertifikat</label>
            <input className="input" type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => uploadTemplate(e.target.files?.[0])} disabled={uploading} />
            <div className="help">{uploading ? "Mengunggah..." : "PNG/JPG/WebP, maksimal 4 MB. Jika tidak diunggah, template default akan digunakan."}</div>
            {imageUrl ? <button className="btn btn-secondary btn-small" type="button" onClick={() => setImageUrl("")}>Gunakan Template Default</button> : null}
          </div>

          <button className="btn btn-primary" type="submit">{event ? "Simpan Perubahan" : "Buat Kegiatan"}</button>
        </form>

        <div className="card stack">
          <div className="card-header">
            <div><h2 style={{ marginBottom: 5 }}>Layout Teks</h2><span className="muted small">Gunakan placeholder untuk data dinamis.</span></div>
            <button className="btn btn-secondary btn-small" type="button" onClick={addField}>+ Teks</button>
          </div>
          <div className="alert alert-info small">
            Placeholder: <code>{"{{participant_name}}"}</code>, <code>{"{{certificate_number}}"}</code>, <code>{"{{event_title}}"}</code>, <code>{"{{event_date}}"}</code>, <code>{"{{organizer}}"}</code>, <code>{"{{signatory}}"}</code>
          </div>

          {config.fields.map((field) => (
            <div className="field-row" key={field.id}>
              <div className="field-row-head">
                <strong className="small">{field.id}</strong>
                <div className="nav">
                  <button className="btn btn-secondary btn-small" type="button" onClick={() => updateField(field.id, { hidden: !field.hidden })}>{field.hidden ? "Tampilkan" : "Sembunyikan"}</button>
                  <button className="btn btn-danger btn-small" type="button" onClick={() => removeField(field.id)}>Hapus</button>
                </div>
              </div>
              <div className="form-group">
                <label>Teks / placeholder</label>
                <input className="input" value={field.template} onChange={(e) => updateField(field.id, { template: e.target.value })} />
              </div>
              <div className="controls-grid" style={{ marginTop: 8 }}>
                <div className="form-group"><label>X (%)</label><input className="input" type="number" step="0.5" value={field.x} onChange={(e) => updateField(field.id, { x: Number(e.target.value) })} /></div>
                <div className="form-group"><label>Y (%)</label><input className="input" type="number" step="0.5" value={field.y} onChange={(e) => updateField(field.id, { y: Number(e.target.value) })} /></div>
                <div className="form-group"><label>Lebar (%)</label><input className="input" type="number" step="1" value={field.width} onChange={(e) => updateField(field.id, { width: Number(e.target.value) })} /></div>
                <div className="form-group"><label>Font (px)</label><input className="input" type="number" step="1" value={field.fontSize} onChange={(e) => updateField(field.id, { fontSize: Number(e.target.value) })} /></div>
                <div className="form-group"><label>Bobot</label><select className="select" value={field.fontWeight} onChange={(e) => updateField(field.id, { fontWeight: Number(e.target.value) })}><option value="400">Regular</option><option value="500">Medium</option><option value="700">Bold</option><option value="800">Extra Bold</option></select></div>
                <div className="form-group"><label>Align</label><select className="select" value={field.align} onChange={(e) => updateField(field.id, { align: e.target.value as TemplateField["align"] })}><option value="left">Kiri</option><option value="center">Tengah</option><option value="right">Kanan</option></select></div>
                <div className="form-group"><label>Warna</label><input className="input" type="color" value={field.color} onChange={(e) => updateField(field.id, { color: e.target.value })} /></div>
                <div className="form-group"><label>Italic</label><select className="select" value={field.italic ? "yes" : "no"} onChange={(e) => updateField(field.id, { italic: e.target.value === "yes" })}><option value="no">Tidak</option><option value="yes">Ya</option></select></div>
              </div>
            </div>
          ))}

          <div className="field-row">
            <div className="field-row-head"><strong className="small">QR Code Validasi</strong><button className="btn btn-secondary btn-small" type="button" onClick={() => setConfig((current) => ({ ...current, qr: { ...current.qr, hidden: !current.qr.hidden } }))}>{config.qr.hidden ? "Tampilkan" : "Sembunyikan"}</button></div>
            <div className="controls-grid">
              <div className="form-group"><label>X (%)</label><input className="input" type="number" step="0.5" value={config.qr.x} onChange={(e) => setConfig((c) => ({ ...c, qr: { ...c.qr, x: Number(e.target.value) } }))} /></div>
              <div className="form-group"><label>Y (%)</label><input className="input" type="number" step="0.5" value={config.qr.y} onChange={(e) => setConfig((c) => ({ ...c, qr: { ...c.qr, y: Number(e.target.value) } }))} /></div>
              <div className="form-group"><label>Ukuran (%)</label><input className="input" type="number" step="0.5" value={config.qr.size} onChange={(e) => setConfig((c) => ({ ...c, qr: { ...c.qr, size: Number(e.target.value) } }))} /></div>
            </div>
          </div>

          <button className="btn btn-secondary" type="button" onClick={() => setConfig(cloneDefault())}>Reset Layout Default</button>
          <div className="help">Setelah mengubah layout, klik <strong>Simpan Perubahan</strong> pada Master Kegiatan agar konfigurasi tersimpan.</div>
        </div>
      </div>
    </section>
  );
}
