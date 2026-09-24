import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import EventEditor from "../../event-editor";

export default async function NewEventPage() {
  await requireAdmin();

  return (
    <>
      <header className="topbar admin-topbar">
        <div className="container topbar-inner">
          <Link className="brand" href="/admin">
            <span className="brand-mark">SI</span>
            <span>
              Sertifikat ITTS
              <small>Certificate Management</small>
            </span>
          </Link>
          <Link className="btn btn-secondary btn-small" href="/admin">
            ← Dashboard
          </Link>
        </div>
      </header>

      <main className="container page admin-page">
        <div className="workspace-page-header">
          <div>
            <div className="breadcrumb">Dashboard / Kegiatan / Baru</div>
            <h1 className="page-title">Buat kegiatan baru</h1>
            <p>
              Lengkapi informasi kegiatan lalu susun template sertifikat sebelum diterbitkan
              kepada peserta.
            </p>
          </div>
          <div className="workflow-badge">
            <span>01</span>
            Setup kegiatan
          </div>
        </div>

        <EventEditor />
      </main>
    </>
  );
}
