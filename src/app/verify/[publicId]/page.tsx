import Link from "next/link";
import { getCertificateByPublicId, getEvent } from "@/lib/db";
import { formatDateId } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function VerifyPage({ params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await params;
  const certificate = await getCertificateByPublicId(publicId);

  if (!certificate) {
    return (
      <main className="verify-shell">
        <div className="card verify-card">
          <div className="verify-icon revoked">×</div>
          <h1 style={{ fontSize: 38 }}>Sertifikat tidak ditemukan</h1>
          <p className="lead" style={{ margin: "0 auto" }}>Kode validasi tidak terdaftar pada sistem Sertifikat ITTS.</p>
          <div className="actions" style={{ justifyContent: "center" }}><Link className="btn btn-secondary" href="/">Kembali</Link></div>
        </div>
      </main>
    );
  }

  const event = await getEvent(certificate.event_id);

  if (!event) {
    return (
      <main className="verify-shell"><div className="card verify-card"><h1>Data kegiatan tidak ditemukan</h1></div></main>
    );
  }

  const valid = certificate.status === "valid";

  return (
    <main className="verify-shell">
      <div className="card verify-card">
        <div className={"verify-icon " + (valid ? "valid" : "revoked")}>{valid ? "✓" : "!"}</div>
        <span className={"badge " + (valid ? "badge-valid" : "badge-revoked")}>{valid ? "SERTIFIKAT VALID" : "SERTIFIKAT DICABUT"}</span>
        <h1 style={{ fontSize: 38, marginTop: 18 }}>{certificate.participant_name}</h1>
        <p className="lead" style={{ margin: "0 auto" }}>
          {valid
            ? "Sertifikat ini tercatat pada sistem dan statusnya valid."
            : "Sertifikat pernah diterbitkan, tetapi statusnya telah dicabut oleh administrator."}
        </p>

        <div className="detail-list">
          <div className="detail-item"><span>Nomor Sertifikat</span><strong>{certificate.certificate_number}</strong></div>
          <div className="detail-item"><span>Nama Kegiatan</span><strong>{event.title}</strong></div>
          <div className="detail-item"><span>Tanggal Kegiatan</span><strong>{formatDateId(event.event_date)}</strong></div>
          <div className="detail-item"><span>Penyelenggara</span><strong>{event.organizer}</strong></div>
          <div className="detail-item"><span>Tanggal Terbit</span><strong>{formatDateId(certificate.issued_at)}</strong></div>
          <div className="detail-item"><span>Versi Template</span><strong>v{certificate.template_version_number ?? "—"}</strong></div>
          <div className="detail-item"><span>ID Validasi</span><strong>{certificate.public_id.slice(0, 16).toUpperCase()}</strong></div>
        </div>

        {!valid && certificate.revoke_reason ? <div className="alert alert-error">Alasan: {certificate.revoke_reason}</div> : null}
        <div className="actions" style={{ justifyContent: "center" }}>
          <Link className="btn btn-primary" href={"/certificate/" + certificate.id}>Lihat Sertifikat</Link>
          <Link className="btn btn-secondary" href="/">Sertifikat ITTS</Link>
        </div>
      </div>
    </main>
  );
}
