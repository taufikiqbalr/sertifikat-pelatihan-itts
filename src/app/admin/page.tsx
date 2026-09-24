import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import {
  databaseErrorMessage,
  getDashboardStats,
  hasDatabaseConfig,
  listEvents
} from "@/lib/db";
import { formatDateId, type EventRecord } from "@/lib/types";
import { logoutAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  await requireAdmin();

  const configured = hasDatabaseConfig();
  let databaseError: string | null = null;
  let stats = { events: 0, certificates: 0, valid: 0, revoked: 0 };
  let events: EventRecord[] = [];

  if (configured) {
    try {
      [stats, events] = await Promise.all([getDashboardStats(), listEvents()]);
    } catch (error) {
      console.error("[admin] dashboard database load failed", error);
      databaseError = databaseErrorMessage(error);
    }
  }

  return (
    <>
      <header className="topbar">
        <div className="container topbar-inner">
          <Link className="brand" href="/admin">
            <span className="brand-mark">SI</span>
            <span>Sertifikat ITTS</span>
          </Link>
          <nav className="nav">
            <Link className="btn btn-primary btn-small" href="/admin/events/new">
              + Kegiatan
            </Link>
            <form action={logoutAction}>
              <button className="btn btn-secondary btn-small" type="submit">
                Keluar
              </button>
            </form>
          </nav>
        </div>
      </header>

      <main className="container page">
        <div className="page-header">
          <div>
            <div className="breadcrumb">Admin / Dashboard</div>
            <h1 className="page-title">Dashboard Sertifikat</h1>
            <p className="muted">
              Kelola kegiatan, template, penerbitan, dan status validasi sertifikat.
            </p>
          </div>
        </div>

        {!configured ? (
          <div className="alert alert-info" style={{ marginBottom: 18 }}>
            <strong>Database belum dikonfigurasi.</strong>
            <br />
            Hubungkan Neon ke project Vercel dan pastikan <code>DATABASE_URL</code>
            tersedia untuk deployment ini, kemudian redeploy.
            <br />
            <Link href="/api/health" target="_blank">
              Cek status konfigurasi →
            </Link>
          </div>
        ) : null}

        {databaseError ? (
          <div className="alert alert-error" style={{ marginBottom: 18 }}>
            <strong>Dashboard berhasil login, tetapi database belum dapat digunakan.</strong>
            <br />
            {databaseError}
            <br />
            <Link href="/api/health" target="_blank">
              Buka health check →
            </Link>
          </div>
        ) : null}

        <section className="stats">
          <div className="stat">
            <span className="muted small">Kegiatan</span>
            <strong>{stats.events}</strong>
          </div>
          <div className="stat">
            <span className="muted small">Sertifikat terbit</span>
            <strong>{stats.certificates}</strong>
          </div>
          <div className="stat">
            <span className="muted small">Valid</span>
            <strong>{stats.valid}</strong>
          </div>
          <div className="stat">
            <span className="muted small">Dicabut</span>
            <strong>{stats.revoked}</strong>
          </div>
        </section>

        <section className="card">
          <div className="card-header">
            <div>
              <h2 style={{ marginBottom: 5 }}>Kegiatan</h2>
              <span className="muted small">
                Satu kegiatan memiliki satu master template sertifikat.
              </span>
            </div>
            <Link className="btn btn-primary" href="/admin/events/new">
              Buat Kegiatan
            </Link>
          </div>

          {events.length ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Kegiatan</th>
                    <th>Tanggal</th>
                    <th>Penyelenggara</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((event) => (
                    <tr key={event.id}>
                      <td>
                        <strong>{event.title}</strong>
                        <div className="muted small">{event.certificate_prefix}</div>
                      </td>
                      <td>{formatDateId(event.event_date)}</td>
                      <td>{event.organizer}</td>
                      <td>
                        <span
                          className={
                            "badge " +
                            (event.status === "active" ? "badge-valid" : "badge-draft")
                          }
                        >
                          {event.status}
                        </span>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <Link
                          className="btn btn-secondary btn-small"
                          href={"/admin/events/" + event.id}
                        >
                          Kelola
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="muted">
              Belum ada kegiatan. Buat kegiatan pertama untuk mulai menerbitkan sertifikat.
            </p>
          )}
        </section>
      </main>
    </>
  );
}
