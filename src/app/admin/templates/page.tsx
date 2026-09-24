import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { listCertificateTemplates } from "@/lib/db";
import AdminHeader from "../admin-header";
import TemplateLibrary from "../template-library";

export const dynamic = "force-dynamic";

export default async function TemplatesPage() {
  await requireAdmin();
  const templates = await listCertificateTemplates(true);
  const activeCount = templates.filter((template) => template.status === "active").length;
  const usageCount = templates.reduce(
    (total, template) => total + (template.usage_count ?? 0),
    0
  );

  return (
    <>
      <AdminHeader active="templates" />
      <main className="container page admin-page">
        <div className="dashboard-hero template-library-hero">
          <div>
            <span className="section-kicker">Template Library</span>
            <h1 className="page-title">Template Sertifikat</h1>
            <p>
              Kelola desain sertifikat sebagai master reusable. Satu template dapat dipakai
              oleh banyak kegiatan tanpa menduplikasi layout.
            </p>
          </div>
          <Link className="btn btn-primary" href="/admin/templates/new">
            + Template baru
          </Link>
        </div>

        <section className="stats template-stats">
          <div className="stat stat-accent">
            <span>Total template</span>
            <strong>{templates.length}</strong>
            <small>Seluruh library</small>
          </div>
          <div className="stat">
            <span>Template aktif</span>
            <strong>{activeCount}</strong>
            <small>Siap digunakan</small>
          </div>
          <div className="stat">
            <span>Digunakan</span>
            <strong>{usageCount}</strong>
            <small>Assignment ke kegiatan</small>
          </div>
          <div className="stat">
            <span>Default</span>
            <strong>{templates.filter((template) => template.is_default).length}</strong>
            <small>Otomatis dipilih</small>
          </div>
        </section>

        <section className="dashboard-section">
          <div className="section-heading-row">
            <div>
              <span className="section-kicker">Library</span>
              <h2>Master template</h2>
              <p>Edit, duplikasi, arsipkan, dan lihat riwayat penggunaan template.</p>
            </div>
            <span className="section-count">{templates.length} template</span>
          </div>

          <TemplateLibrary templates={templates} />
        </section>
      </main>
    </>
  );
}
