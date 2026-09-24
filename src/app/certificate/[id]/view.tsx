"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";
import {
  formatDateId,
  renderText,
  resolveTemplateFontSize,
  type CertificateRecord,
  type EventRecord,
  type TemplateVersionRecord
} from "@/lib/types";

export default function CertificateView({
  certificate,
  event,
  templateVersion,
  canArchiveToDrive,
  driveConfigured
}: {
  certificate: CertificateRecord;
  event: EventRecord;
  templateVersion: TemplateVersionRecord;
  canArchiveToDrive: boolean;
  driveConfigured: boolean;
}) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [origin, setOrigin] = useState(process.env.NEXT_PUBLIC_APP_URL || "");
  const [driveSaving, setDriveSaving] = useState(false);
  const [driveError, setDriveError] = useState("");
  const [driveNotice, setDriveNotice] = useState("");
  const [driveState, setDriveState] = useState({
    fileId: certificate.drive_file_id,
    fileName: certificate.drive_file_name,
    webViewLink: certificate.drive_web_view_link,
    uploadedAt: certificate.drive_uploaded_at
  });

  useEffect(() => {
    if (!origin) setOrigin(window.location.origin);
  }, [origin]);

  const values = useMemo(() => {
    const snapshot = certificate.issuance_snapshot || {};
    return {
      participant_name: certificate.participant_name,
      certificate_number: certificate.certificate_number,
      event_title: snapshot.event_title || event.title,
      event_date: formatDateId(snapshot.event_date || event.event_date),
      organizer: snapshot.organizer || event.organizer,
      signatory: snapshot.signatory || event.signatory,
      ...certificate.custom_data
    };
  }, [certificate, event]);

  const verifyUrl = (origin || "") + "/verify/" + certificate.public_id;
  const config = templateVersion.template_config;

  async function pngData() {
    if (!canvasRef.current) throw new Error("Canvas sertifikat belum siap.");
    return toPng(canvasRef.current, { pixelRatio: 2, cacheBust: true });
  }

  async function downloadPng() {
    const dataUrl = await pngData();
    const anchor = document.createElement("a");
    anchor.href = dataUrl;
    anchor.download =
      "sertifikat-" +
      certificate.participant_name.replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase() +
      ".png";
    anchor.click();
  }

  async function createPdf() {
    const dataUrl = await pngData();
    const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    pdf.addImage(dataUrl, "PNG", 0, 0, 297, 210);
    return pdf;
  }

  function certificatePdfName() {
    return (
      "sertifikat-" +
      certificate.participant_name.replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase() +
      ".pdf"
    );
  }

  async function downloadPdf() {
    const pdf = await createPdf();
    pdf.save(certificatePdfName());
  }

  async function saveToDrive() {
    if (!driveConfigured || driveSaving) return;

    setDriveSaving(true);
    setDriveError("");
    setDriveNotice("");

    try {
      const pdf = await createPdf();
      const blob = pdf.output("blob");
      const formData = new FormData();
      formData.set("file", blob, certificatePdfName());

      const response = await fetch(
        "/api/certificates/" + certificate.id + "/drive",
        {
          method: "POST",
          body: formData
        }
      );

      const result = (await response.json()) as {
        ok?: boolean;
        error?: string;
        fileId?: string;
        fileName?: string;
        webViewLink?: string;
        uploadedAt?: string;
      };

      if (!response.ok || !result.ok) {
        throw new Error(result.error || "Gagal menyimpan sertifikat ke Google Drive.");
      }

      setDriveState({
        fileId: result.fileId || null,
        fileName: result.fileName || certificatePdfName(),
        webViewLink: result.webViewLink || null,
        uploadedAt: result.uploadedAt || new Date().toISOString()
      });
      setDriveNotice(
        driveState.fileId
          ? "PDF di Google Drive berhasil diperbarui."
          : "PDF sertifikat berhasil disimpan ke Google Drive."
      );
    } catch (error) {
      setDriveError(
        error instanceof Error
          ? error.message
          : "Gagal menyimpan sertifikat ke Google Drive."
      );
    } finally {
      setDriveSaving(false);
    }
  }

  return (
    <div className="stack">
      <div className="page-header">
        <div>
          <div className="breadcrumb">Sertifikat / {event.title}</div>
          <h1 className="page-title">{certificate.participant_name}</h1>
          <p className="muted">
            {certificate.certificate_number} · Template v{templateVersion.version_number}
          </p>
        </div>
        <div className="actions" style={{ marginTop: 0 }}>
          <button className="btn btn-secondary" type="button" onClick={downloadPng}>
            Unduh PNG
          </button>
          <button className="btn btn-primary" type="button" onClick={downloadPdf}>
            Unduh PDF
          </button>
          {canArchiveToDrive ? (
            <button
              className="btn btn-drive"
              type="button"
              onClick={saveToDrive}
              disabled={!driveConfigured || driveSaving}
              title={
                driveConfigured
                  ? "Simpan PDF sertifikat ke Google Drive"
                  : "Konfigurasi Google Drive belum tersedia"
              }
            >
              {driveSaving
                ? "Menyimpan..."
                : driveState.fileId
                  ? "Perbarui di Drive"
                  : "Simpan ke Drive"}
            </button>
          ) : null}
          {canArchiveToDrive && driveState.webViewLink ? (
            <a
              className="btn btn-secondary"
              href={driveState.webViewLink}
              target="_blank"
              rel="noreferrer"
            >
              Buka di Drive
            </a>
          ) : null}
        </div>
      </div>

      {canArchiveToDrive && !driveConfigured ? (
        <div className="alert alert-info">
          <strong>Google Drive belum dikonfigurasi.</strong> Tambahkan credential Drive
          di Environment Variables Vercel untuk mengaktifkan arsip PDF.
        </div>
      ) : null}

      {driveNotice ? (
        <div className="alert alert-success">
          <strong>{driveNotice}</strong>
          {driveState.fileName ? " " + driveState.fileName : ""}
        </div>
      ) : null}

      {driveError ? (
        <div className="alert alert-error">
          <strong>Upload Drive gagal.</strong> {driveError}
        </div>
      ) : null}

      {certificate.status === "revoked" ? (
        <div className="alert alert-error">
          <strong>Sertifikat ini telah dicabut.</strong> QR Code akan tetap mengarah ke
          halaman validasi dengan status dicabut.
        </div>
      ) : null}

      <div
        ref={canvasRef}
        className="certificate-canvas"
        style={{ width: "min(1123px, 100%)", margin: "0 auto", borderRadius: 0 }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={templateVersion.template_image_url || "/default-certificate.svg"}
          alt={"Template sertifikat versi " + templateVersion.version_number}
        />

        {config.fields
          .filter((field) => !field.hidden)
          .map((field) => {
            const rendered = renderText(field.template, values);
            const fittedSize = resolveTemplateFontSize(field, rendered);

            return (
            <div
              key={field.id}
              style={{
                position: "absolute",
                left: field.x + "%",
                top: field.y + "%",
                width: field.width + "%",
                transform: "translate(-50%, -50%)",
                fontSize: fittedSize / 11.23 + "cqw",
                fontWeight: field.fontWeight,
                color: field.color,
                textAlign: field.align,
                fontStyle: field.italic ? "italic" : "normal",
                lineHeight: field.lineHeight ?? 1.12,
                letterSpacing: field.letterSpacing
                  ? field.letterSpacing / 11.23 + "cqw"
                  : undefined,
                overflowWrap: "break-word",
                padding: "3px 5px"
              }}
            >
              {rendered}
            </div>
            );
          })}

        {!config.qr.hidden && verifyUrl.startsWith("http") ? (
          <div
            style={{
              position: "absolute",
              left: config.qr.x + "%",
              top: config.qr.y + "%",
              width: config.qr.size + "%",
              transform: "translate(-50%, -50%)",
              background: "#fff",
              padding: "4px"
            }}
          >
            <QRCodeSVG
              value={verifyUrl}
              size={160}
              level="M"
              includeMargin={false}
              style={{ width: "100%", height: "auto", display: "block" }}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
