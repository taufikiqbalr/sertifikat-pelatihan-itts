import { requireAdmin } from "@/lib/auth";
import { listCertificateTemplates } from "@/lib/db";
import AdminHeader from "../../admin-header";
import EventEditor from "../../event-editor";

export const dynamic = "force-dynamic";

export default async function NewEventPage() {
  await requireAdmin();
  const templates = await listCertificateTemplates(false);

  return (
    <>
      <AdminHeader active="dashboard" />
      <main className="container page admin-page">
        <div className="workspace-page-header">
          <div>
            <div className="breadcrumb">Kegiatan / Baru</div>
            <h1 className="page-title">Buat kegiatan baru</h1>
            <p>
              Lengkapi informasi kegiatan dan pilih master template dari Template Library.
            </p>
          </div>
          <div className="workflow-badge">
            <span>01</span>
            Setup kegiatan
          </div>
        </div>

        <EventEditor templates={templates} />
      </main>
    </>
  );
}
