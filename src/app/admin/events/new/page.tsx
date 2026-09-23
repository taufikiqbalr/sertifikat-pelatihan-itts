import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import EventEditor from "../../event-editor";

export default async function NewEventPage() {
  await requireAdmin();

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
            <div className="breadcrumb">Admin / Kegiatan / Baru</div>
            <h1 className="page-title">Buat Master Kegiatan</h1>
            <p className="muted">Atur identitas kegiatan, gambar template, posisi teks, dan QR Code.</p>
          </div>
        </div>
        <EventEditor />
      </main>
    </>
  );
}
