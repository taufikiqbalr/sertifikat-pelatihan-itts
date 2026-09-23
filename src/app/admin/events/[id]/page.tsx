import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { getEvent, listCertificates } from "@/lib/db";
import { formatDateId } from "@/lib/types";
import EventEditor from "../../event-editor";
import { issueCertificatesAction, restoreCertificateAction, revokeCertificateAction } from "../../actions";

export default async function EventDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; created?: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const query = await searchParams;
  const event = await getEvent(id);
  if (!event) notFound();
  const certificates = await listCertificates(id);

  return (
    <>
      <header className="topbar">
        <div className="container topbar-inner">
          <Link className="brand" href="/admin"><span className="brand-mark">SI</span><span>Sertifikat ITTS</span></Link>
          <Link className="btn btn-secondary btn-small" href="/admin">← Dashboard</Link>
        </div>
      </header>

      <main className="container page">
        <div className="page-header">
          <div>
            <div className="breadcrumb">Admin / Kegiatan / {event.title}</div>
            <h1 className="page-title">{event.title}</h1>
            <p className="muted">{formatDateId(event.event_date)} · {event.organizer}</p>
          </div>
        </div>

        {query.created ? <div className="alert alert-info" style={{ marginBottom: 18 }}>Kegiatan berhasil dibuat. Master template siap digunakan.</div> : null}
        {query.saved ? <div className="alert alert-info" style={{ marginBottom: 18 }}>Perubahan master template berhasil disimpan.</div> : null}

        <EventEditor event={event} />

        <section className="card" style={{ marginTop: 22 }}>
          <div className="card-header">
            <div>
              <h2 style={{ marginBottom: 5 }}>Terbitkan Sertifikat</h2>
              <span className="muted small">Masukkan satu peserta per baris. Format: Nama, Email, Nomor Sertifikat. Email dan nomor bersifat opsional.</span>
            </div>
          </div>
          <form action={issueCertificatesAction} className="stack">
            <input type="hidden" name="event_id" value={event.id} />
            <div className="form-group">
              <label htmlFor="participants">Daftar peserta</label>
              <textarea
                className="textarea"
                id="participants"
                name="participants"
                rows={7}
                placeholder={"Nama Peserta,email@example.com,ITTS/WEB/2026/001\nPeserta Kedua,peserta2@example.com"}
                required
              />
              <div className="help">Delimiter dapat menggunakan koma (,), titik koma (;), atau pipe (|). Jika nomor kosong, sistem akan membuat nomor unik menggunakan prefix kegiatan.</div>
            </div>
            <div><button className="btn btn-primary" type="submit">Terbitkan Sertifikat</button></div>
          </form>
        </section>

        <section className="card" style={{ marginTop: 22 }}>
          <div className="card-header">
            <div>
              <h2 style={{ marginBottom: 5 }}>Sertifikat Peserta</h2>
              <span className="muted small">{certificates.length} sertifikat diterbitkan.</span>
            </div>
          </div>

          {certificates.length ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Peserta</th><th>Nomor</th><th>Terbit</th><th>Status</th><th>Aksi</th></tr>
                </thead>
                <tbody>
                  {certificates.map((cert) => (
                    <tr key={cert.id}>
                      <td><strong>{cert.participant_name}</strong><div className="muted small">{cert.participant_email || "—"}</div></td>
                      <td>{cert.certificate_number}</td>
                      <td>{formatDateId(cert.issued_at)}</td>
                      <td><span className={"badge " + (cert.status === "valid" ? "badge-valid" : "badge-revoked")}>{cert.status === "valid" ? "Valid" : "Dicabut"}</span></td>
                      <td>
                        <div className="nav">
                          <Link className="btn btn-secondary btn-small" href={"/certificate/" + cert.id} target="_blank">Buka</Link>
                          <Link className="btn btn-secondary btn-small" href={"/verify/" + cert.public_id} target="_blank">Validasi</Link>
                          {cert.status === "valid" ? (
                            <form action={revokeCertificateAction}>
                              <input type="hidden" name="certificate_id" value={cert.id} />
                              <input type="hidden" name="event_id" value={event.id} />
                              <input type="hidden" name="reason" value="Dicabut oleh administrator" />
                              <button className="btn btn-danger btn-small" type="submit">Cabut</button>
                            </form>
                          ) : (
                            <form action={restoreCertificateAction}>
                              <input type="hidden" name="certificate_id" value={cert.id} />
                              <input type="hidden" name="event_id" value={event.id} />
                              <button className="btn btn-secondary btn-small" type="submit">Pulihkan</button>
                            </form>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="muted">Belum ada sertifikat peserta pada kegiatan ini.</p>}
        </section>
      </main>
    </>
  );
}
