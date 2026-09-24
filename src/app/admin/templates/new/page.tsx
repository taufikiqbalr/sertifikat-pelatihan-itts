import { requireAdmin } from "@/lib/auth";
import AdminHeader from "../../admin-header";
import TemplateEditor from "../../template-editor";

export default async function NewTemplatePage() {
  await requireAdmin();

  return (
    <>
      <AdminHeader active="templates" />
      <main className="container page admin-page">
        <div className="workspace-page-header">
          <div>
            <div className="breadcrumb">Template Sertifikat / Baru</div>
            <h1 className="page-title">Buat template sertifikat</h1>
            <p>
              Susun satu master desain yang dapat digunakan berulang kali untuk berbagai
              kegiatan.
            </p>
          </div>
          <div className="workflow-badge">
            <span>T</span>
            Template Library
          </div>
        </div>

        <TemplateEditor />
      </main>
    </>
  );
}
