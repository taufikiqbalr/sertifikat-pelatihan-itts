import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import {
  getCertificateTemplate,
  listTemplateUsage,
  listTemplateVersions
} from "@/lib/db";
import { formatDateId } from "@/lib/types";
import AdminHeader from "../../admin-header";
import TemplateEditor from "../../template-editor";
import TemplatePreview from "../../template-preview";
import {
  duplicateTemplateAction,
  restoreTemplateVersionAction,
  setDefaultTemplateAction,
  toggleTemplateStatusAction
} from "../../actions";

export const dynamic = "force-dynamic";

export default async function TemplateDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    saved?: string;
    created?: string;
    duplicated?: string;
    default?: string;
    status?: string;
    restored?: string;
    version?: string;
  }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const query = await searchParams;

  const [template, usage, versions] = await Promise.all([
    getCertificateTemplate(id),
    listTemplateUsage(id),
    listTemplateVersions(id)
  ]);
  if (!template) notFound();

  return (
    <>
      <AdminHeader active="templates" />
      <main className="container page admin-page">
        <div className="event-detail-hero template-detail-hero">
          <div className="event-detail-main">
            <div className="breadcrumb">Template Sertifikat / Detail</div>
            <div className="event-title-line">
              <h1 className="page-title">{template.name}</h1>
              <span className="badge badge-version">v{template.current_version}</span>
              {template.is_default ? (
                <span className="badge badge-default">Default</span>
              ) : null}
              <span
                className={
                  "badge " +
                  (template.status === "active" ? "badge-valid" : "badge-neutral")
                }
              >
                {template.status === "active" ? "Aktif" : "Arsip"}
              </span>
            </div>
            <p>
              {template.description ||
                "Master template reusable untuk penerbitan sertifikat ITTS."}
            </p>
          </div>

          <div className="template-detail-actions">
            <form action={duplicateTemplateAction}>
              <input type="hidden" name="template_id" value={template.id} />
              <button className="btn btn-secondary btn-small" type="submit">
                Duplikasi
              </button>
            </form>
            {!template.is_default ? (
              <form action={setDefaultTemplateAction}>
                <input type="hidden" name="template_id" value={template.id} />
                <button className="btn btn-secondary btn-small" type="submit">
                  Jadikan default
                </button>
              </form>
            ) : null}
            <form action={toggleTemplateStatusAction}>
              <input type="hidden" name="template_id" value={template.id} />
              <button
                className={
                  "btn btn-small " +
                  (template.status === "active" ? "btn-danger" : "btn-secondary")
                }
                type="submit"
                disabled={template.is_default && template.status === "active"}
              >
                {template.status === "active" ? "Arsipkan" : "Aktifkan"}
              </button>
            </form>
          </div>
        </div>

        {query.created ? (
          <div className="alert alert-success" style={{ marginBottom: 18 }}>
            Template berhasil dibuat sebagai <strong>versi 1</strong> dan sudah masuk ke
            Template Library.
          </div>
        ) : null}
        {query.saved ? (
          <div className="alert alert-success" style={{ marginBottom: 18 }}>
            Versi baru template berhasil diterbitkan
            {query.version ? <> sebagai <strong>v{query.version}</strong></> : null}.
            Sertifikat yang sudah terbit tetap menggunakan versi lamanya.
          </div>
        ) : null}
        {query.restored ? (
          <div className="alert alert-success" style={{ marginBottom: 18 }}>
            Versi {query.restored} berhasil dipulihkan sebagai versi baru
            {query.version ? <> <strong>v{query.version}</strong></> : null}. Histori lama
            tidak diubah.
          </div>
        ) : null}
        {query.duplicated ? (
          <div className="alert alert-success" style={{ marginBottom: 18 }}>
            Salinan template berhasil dibuat. Silakan ubah nama dan desainnya.
          </div>
        ) : null}
        {query.default ? (
          <div className="alert alert-success" style={{ marginBottom: 18 }}>
            Template ini sekarang menjadi default untuk kegiatan baru.
          </div>
        ) : null}

        <TemplateEditor template={template} />

        <section className="workspace-section" id="versions">
          <div className="section-heading-row">
            <div>
              <span className="section-kicker">Version History</span>
              <h2>Riwayat versi template</h2>
              <p>
                Setiap versi bersifat immutable. Sertifikat menyimpan versi template saat
                diterbitkan sehingga perubahan desain tidak mengubah dokumen lama.
              </p>
            </div>
            <span className="section-count">{versions.length} versi</span>
          </div>

          <div className="version-history-list">
            {versions.map((version) => {
              const current = version.id === template.current_version_id;
              return (
                <article className={"version-card " + (current ? "current" : "")} key={version.id}>
                  <div className="version-preview-wrap">
                    <TemplatePreview
                      config={version.template_config}
                      imageUrl={version.template_image_url}
                    />
                  </div>

                  <div className="version-card-body">
                    <div className="version-card-title">
                      <div>
                        <div className="template-badges">
                          <span className="badge badge-version">v{version.version_number}</span>
                          {current ? (
                            <span className="badge badge-valid">Versi aktif</span>
                          ) : null}
                        </div>
                        <h3>{version.change_note || "Perubahan template"}</h3>
                      </div>
                      <span className="usage-pill">
                        {version.certificate_count ?? 0} sertifikat
                      </span>
                    </div>

                    <div className="version-meta-row">
                      <span>Dibuat {formatDateId(version.created_at)}</span>
                      <span>
                        {version.template_image_url ? "Background custom" : "Background ITTS"}
                      </span>
                      <span>{version.template_config.fields.length} elemen teks</span>
                    </div>

                    {!current ? (
                      <form action={restoreTemplateVersionAction}>
                        <input type="hidden" name="template_id" value={template.id} />
                        <input type="hidden" name="version_id" value={version.id} />
                        <button className="btn btn-secondary btn-small" type="submit">
                          Pulihkan sebagai versi baru
                        </button>
                      </form>
                    ) : (
                      <div className="version-lock-note">
                        Versi aktif untuk penerbitan sertifikat berikutnya.
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="workspace-section" id="usage">
          <div className="section-heading-row">
            <div>
              <span className="section-kicker">Usage History</span>
              <h2>Riwayat penggunaan</h2>
              <p>Kegiatan yang saat ini menggunakan master template ini.</p>
            </div>
            <span className="section-count">{usage.length} kegiatan</span>
          </div>

          <div className="card usage-card">
            {usage.length ? (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Kegiatan</th>
                      <th>Tanggal</th>
                      <th>Status</th>
                      <th>Sertifikat</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {usage.map((event) => (
                      <tr key={event.id}>
                        <td>
                          <strong>{event.title}</strong>
                        </td>
                        <td>{formatDateId(event.event_date)}</td>
                        <td>
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
                            {event.status}
                          </span>
                        </td>
                        <td>{event.certificate_count}</td>
                        <td style={{ textAlign: "right" }}>
                          <Link
                            className="btn btn-secondary btn-small"
                            href={"/admin/events/" + event.id}
                          >
                            Buka kegiatan
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-state-icon">◎</div>
                <h3>Belum digunakan</h3>
                <p>Template ini belum ditugaskan ke kegiatan mana pun.</p>
              </div>
            )}
          </div>
        </section>
      </main>
    </>
  );
}
