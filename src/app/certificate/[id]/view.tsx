"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";
import {
  formatDateId,
  renderText,
  type CertificateRecord,
  type EventRecord,
  type TemplateVersionRecord
} from "@/lib/types";

export default function CertificateView({
  certificate,
  event,
  templateVersion
}: {
  certificate: CertificateRecord;
  event: EventRecord;
  templateVersion: TemplateVersionRecord;
}) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [origin, setOrigin] = useState(process.env.NEXT_PUBLIC_APP_URL || "");

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

  async function downloadPdf() {
    const dataUrl = await pngData();
    const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    pdf.addImage(dataUrl, "PNG", 0, 0, 297, 210);
    pdf.save(
      "sertifikat-" +
        certificate.participant_name.replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase() +
        ".pdf"
    );
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
        </div>
      </div>

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
          .map((field) => (
            <div
              key={field.id}
              style={{
                position: "absolute",
                left: field.x + "%",
                top: field.y + "%",
                width: field.width + "%",
                transform: "translate(-50%, -50%)",
                fontSize: field.fontSize + "px",
                fontWeight: field.fontWeight,
                color: field.color,
                textAlign: field.align,
                fontStyle: field.italic ? "italic" : "normal",
                lineHeight: 1.12,
                padding: "3px 5px"
              }}
            >
              {renderText(field.template, values)}
            </div>
          ))}

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
