import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import {
  databaseErrorMessage,
  getDashboardStats,
  hasDatabaseConfig,
  listEventsWithStats
} from "@/lib/db";
import { logoutAction } from "./actions";
import EventCatalog, { type EventSummary } from "./event-catalog";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  await requireAdmin();

  const configured = hasDatabaseConfig();
  let databaseError: string | null = null;
  let stats = { events: 0, certificates: 0, valid: 0, revoked: 0 };
  let events: EventSummary[] = [];

  if (configured) {
    try {
      [stats, events] = await Promise.all([getDashboardStats(), listEventsWithStats()]);
    } catch (error) {
      console.error("[admin] dashboard database load failed", error);
      databaseError = databaseErrorMessage(error);
    }
  }

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
          <nav className="nav">
            <Link className="btn btn-primary btn-small" href="/admin/events/new">
              + Buat Kegiatan
            </Link>
            <form action={logoutAction}>
              <button className="btn btn-secondary btn-small" type="submit">
                Keluar
              </button>
            </form>
          </nav>
        </div>
      </header>

      <main className="container page admin-page">
        <div className="dashboard-hero">
          <div>
            <span className="section-kicker">Certificate Management</span>
            <h1 className="page-title">Manajemen Sertifikat</h1>
            <p>
              Kelola kegiatan, desain template, penerbitan peserta, dan validasi sertifikat
              dari satu workspace.
            </p>
          </div>
          <Link className="btn btn-primary" href="/admin/events/new">
            Buat kegiatan baru
          </Link>
        </div>

        {!configured ? (
          <div className="alert alert-info" style={{ marginBottom: 18 }}>
            <strong>Database belum dikonfigurasi.</strong>
            <br />
            Hubungkan Neon ke project Vercel dan pastikan <code>DATABASE_URL</code>
            tersedia untuk deployment ini, kemudian redeploy.
          </div>
        ) : null}

        {databaseError ? (
          <div className="alert alert-error" style={{ marginBottom: 18 }}>
            <strong>Dashboard berhasil login, tetapi database belum dapat digunakan.</strong>
            <br />
            {databaseError}
          </div>
        ) : null}

        <section className="stats dashboard-stats">
          <div className="stat stat-accent">
            <span>Total kegiatan</span>
            <strong>{stats.events}</strong>
            <small>Master kegiatan tersimpan</small>
          </div>
          <div className="stat">
            <span>Sertifikat terbit</span>
            <strong>{stats.certificates}</strong>
            <small>Seluruh kegiatan</small>
          </div>
          <div className="stat">
            <span>Sertifikat valid</span>
            <strong>{stats.valid}</strong>
            <small>Dapat diverifikasi</small>
          </div>
          <div className="stat">
            <span>Dicabut</span>
            <strong>{stats.revoked}</strong>
            <small>Status revoked</small>
          </div>
        </section>

        <section className="dashboard-section">
          <div className="section-heading-row">
            <div>
              <span className="section-kicker">Kegiatan</span>
              <h2>Daftar kegiatan</h2>
              <p>Cari, filter, dan masuk ke workspace sertifikat tiap kegiatan.</p>
            </div>
            <span className="section-count">{events.length} kegiatan</span>
          </div>

          {events.length ? (
            <EventCatalog events={events} />
          ) : (
            <div className="empty-state empty-state-large">
              <div className="empty-state-icon">+</div>
              <h3>Belum ada kegiatan</h3>
              <p>
                Buat kegiatan pertama, pilih template sertifikat, lalu terbitkan sertifikat
                peserta.
              </p>
              <Link className="btn btn-primary" href="/admin/events/new">
                Buat kegiatan pertama
              </Link>
            </div>
          )}
        </section>
      </main>
    </>
  );
}
