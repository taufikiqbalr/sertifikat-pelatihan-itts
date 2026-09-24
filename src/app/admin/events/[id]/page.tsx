import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import {
  getEvent,
  listCertificateTemplates,
  listCertificates
} from "@/lib/db";
import { formatDateId } from "@/lib/types";
import AdminHeader from "../../admin-header";
import EventEditor from "../../event-editor";
import {
  issueCertificatesAction,
  restoreCertificateAction,
  revokeCertificateAction
} from "../../actions";

export const dynamic = "force-dynamic";

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

  const [event, certificates, templates] = await Promise.all([
    getEvent(id),
    listCertificates(id),
    listCertificateTemplates(true)
  ]);

  if (!event) notFound();

  const validCount = certificates.filter((certificate) => certificate.status === "valid").length;

  return (
    <>
      <AdminHeader active="dashboard" />

      <main className="container page admin-page">
        <div className="event-detail-hero">
          <div className="event-detail-main">
            <div className="breadcrumb">Kegiatan / Detail</div>
            <div className="event-title-line">
              <h1 className="page-title">{event.title}</h1>
              <span
                className={
                  "badge " +
                  (event.status === "active"
                    ? "badge-valid"
                    : event.status === "archived"
                      ? "badge-neutral"
                      : "badge-draft")
                }
              >
                {event.status === "active"
                  ? "Aktif"
                  : event.status === "archived"
                    ? "Arsip"
                    : "Draft"}
              </span>
            </div>
            <p>
              {formatDateId(event.event_date)} · {event.organizer}
            </p>
          </div>

          <div className="event-detail-stats">
            <div>
              <span>Sertifikat</span>
              <strong>{certificates.length}</strong>
            </div>
            <div>
              <span>Valid</span>
              <strong>{validCount}</strong>
            </div>
            <div>
              <span>Template</span>
              <strong>
                {event.template_name || "Legacy"}
                {event.template_current_version ? " · v" + event.template_current_version : ""}
              </strong>
            </div>
          </div>
        </div>

        {query.created ? (
          <div className="alert alert-success" style={{ marginBottom: 18 }}>
            <strong>Kegiatan berhasil dibuat.</strong> Template sudah terhubung dari Template
            Library dan kegiatan siap menerbitkan sertifikat.
          </div>
        ) : null}
        {query.saved ? (
          <div className="alert alert-success" style={{ marginBottom: 18 }}>
            Perubahan kegiatan berhasil disimpan.
          </div>
        ) : null}

        <section className="workspace-section">
          <div className="section-heading-row">
            <div>
              <span className="section-kicker">01 · Konfigurasi</span>
              <h2>Informasi & template kegiatan</h2>
              <p>
                Ubah metadata kegiatan atau assign template lain dari Template Library.
              </p>
            </div>
            {event.template_id ? (
              <Link
                className="btn btn-secondary btn-small"
                href={"/admin/templates/" + event.template_id}
              >
                Edit template master
              </Link>
            ) : null}
          </div>

          <EventEditor event={event} templates={templates} />
        </section>

        <section className="workspace-section">
          <div className="section-heading-row">
            <div>
              <span className="section-kicker">02 · Penerbitan</span>
              <h2>Peserta & sertifikat</h2>
              <p>Terbitkan sertifikat secara batch, lalu kelola status validasinya.</p>
            </div>
            <span className="section-count">{certificates.length} sertifikat</span>
          </div>

          <div className="issue-layout">
            <section className="card issue-card">
              <div className="card-header">
                <div>
                  <span className="section-kicker">Batch issue</span>
                  <h3>Tambahkan peserta</h3>
                </div>
              </div>
              <form action={issueCertificatesAction} className="stack">
                <input type="hidden" name="event_id" value={event.id} />
                <div className="form-group">
                  <label htmlFor="participants">Daftar peserta</label>
                  <textarea
                    className="textarea participant-textarea"
                    id="participants"
                    name="participants"
                    rows={8}
                    placeholder={
                      "Nama Peserta,email@example.com,ITTS/WEB/2026/001\nPeserta Kedua,peserta2@example.com"
                    }
                    required
                  />
                  <div className="help">
                    Satu peserta per baris. Format: Nama, Email, Nomor Sertifikat. Email dan
                    nomor opsional; nomor kosong dibuat otomatis.
                  </div>
                </div>
                <button className="btn btn-primary" type="submit">
                  Terbitkan sertifikat
                </button>
              </form>
            </section>

            <aside className="card issue-guide">
              <span className="section-kicker">Format input</span>
              <h3>Impor cepat</h3>
              <div className="code-sample">
                <code>Nama, Email, Nomor</code>
                <code>Jane Doe, jane@email.com, ITTS/001</code>
                <code>John Doe, john@email.com</code>
              </div>
              <div className="guide-note">
                <strong>Delimiter didukung</strong>
                <span>Koma (,), titik koma (;), atau pipe (|).</span>
              </div>
            </aside>
          </div>

          <section className="card certificate-list-card">
            <div className="card-header">
              <div>
                <h3>Sertifikat peserta</h3>
                <span className="muted small">
                  Buka dokumen, validasi QR, atau ubah status sertifikat.
                </span>
              </div>
            </div>

            {certificates.length ? (
              <div className="table-wrap certificate-table">
                <table>
                  <thead>
                    <tr>
                      <th>Peserta</th>
                      <th>Nomor Sertifikat</th>
                      <th>Terbit</th>
                      <th>Versi</th>
                      <th>Google Drive</th>
                      <th>Status</th>
                      <th>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {certificates.map((cert) => (
                      <tr key={cert.id}>
                        <td>
                          <strong>{cert.participant_name}</strong>
                          <div className="muted small">{cert.participant_email || "—"}</div>
                        </td>
                        <td>
                          <code className="table-code">{cert.certificate_number}</code>
                        </td>
                        <td>{formatDateId(cert.issued_at)}</td>
                        <td>
                          <span className="badge badge-version">
                            v{cert.template_version_number ?? "—"}
                          </span>
                        </td>
                        <td>
                          {cert.drive_web_view_link ? (
                            <a
                              className="badge badge-drive"
                              href={cert.drive_web_view_link}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Tersimpan ↗
                            </a>
                          ) : (
                            <span className="badge badge-neutral">Belum</span>
                          )}
                        </td>
                        <td>
                          <span
                            className={
                              "badge " +
                              (cert.status === "valid" ? "badge-valid" : "badge-revoked")
                            }
                          >
                            {cert.status === "valid" ? "Valid" : "Dicabut"}
                          </span>
                        </td>
                        <td>
                          <div className="nav row-actions">
                            <Link
                              className="btn btn-secondary btn-small"
                              href={"/certificate/" + cert.id}
                              target="_blank"
                            >
                              Sertifikat
                            </Link>
                            <Link
                              className="btn btn-secondary btn-small"
                              href={"/verify/" + cert.public_id}
                              target="_blank"
                            >
                              Validasi
                            </Link>
                            {cert.status === "valid" ? (
                              <form action={revokeCertificateAction}>
                                <input type="hidden" name="certificate_id" value={cert.id} />
                                <input type="hidden" name="event_id" value={event.id} />
                                <input
                                  type="hidden"
                                  name="reason"
                                  value="Dicabut oleh administrator"
                                />
                                <button className="btn btn-danger btn-small" type="submit">
                                  Cabut
                                </button>
                              </form>
                            ) : (
                              <form action={restoreCertificateAction}>
                                <input type="hidden" name="certificate_id" value={cert.id} />
                                <input type="hidden" name="event_id" value={event.id} />
                                <button className="btn btn-secondary btn-small" type="submit">
                                  Pulihkan
                                </button>
                              </form>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-state-icon">◎</div>
                <h3>Belum ada sertifikat</h3>
                <p>Tambahkan peserta di atas untuk menerbitkan sertifikat pertama.</p>
              </div>
            )}
          </section>
        </section>
      </main>
    </>
  );
}
