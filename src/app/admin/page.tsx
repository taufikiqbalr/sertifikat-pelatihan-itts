import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { getDashboardStats, listEvents } from "@/lib/db";
import { formatDateId } from "@/lib/types";
import { logoutAction } from "./actions";

export default async function AdminPage() {
  await requireAdmin();

  const configured = Boolean(process.env.DATABASE_URL);
  const stats = configured ? await getDashboardStats() : { events: 0, certificates: 0, valid: 0, revoked: 0 };
  const events = configured ? await listEvents() : [];

  return (
    <>
      <header className="topbar">
        <div className="container topbar-inner">
          <Link className="brand" href="/admin">
            <span className="brand-mark">SI</span>
            <span>Sertifikat ITTS</span>
          </Link>
          <nav className="nav">
            <Link className="btn btn-primary btn-small" href="/admin/events/new">+ Kegiatan</Link>
            <form action={logoutAction}><button className="btn btn-secondary btn-small" type="submit">Keluar</button></form>
          </nav>
        </div>
      </header>

      <main className="container page">
        <div className="page-header">
          <div>
            <div className="breadcrumb">Admin / Dashboard</div>
            <h1 className="page-title">Dashboard Sertifikat</h1>
            <p className="muted">Kelola kegiatan, template, penerbitan, dan status validasi sertifikat.</p>
          </div>
        </div>

        {!configured ? (
          <div className="alert alert-info">
            <strong>Database belum dikonfigurasi.</strong><br />
            Tambahkan <code>DATABASE_URL</code> pada Environment Variables Vercel, lalu redeploy.
            Aplikasi menggunakan PostgreSQL/Neon dan akan membuat tabel secara otomatis saat pertama kali digunakan.
          </div>
        ) : null}

        <section className="stats">
          <div className="stat"><span className="muted small">Kegiatan</span><strong>{stats.events}</strong></div>
          <div className="stat"><span className="muted small">Sertifikat terbit</span><strong>{stats.certificates}</strong></div>
          <div className="stat"><span className="muted small">Valid</span><strong>{stats.valid}</strong></div>
          <div className="stat"><span className="muted small">Dicabut</span><strong>{stats.revoked}</strong></div>
        </section>

        <section className="card">
          <div className="card-header">
            <div>
              <h2 style={{ marginBottom: 5 }}>Kegiatan</h2>
              <span className="muted small">Satu kegiatan memiliki satu master template sertifikat.</span>
            </div>
            <Link className="btn btn-primary" href="/admin/events/new">Buat Kegiatan</Link>
          </div>

          {events.length ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Kegiatan</th><th>Tanggal</th><th>Penyelenggara</th><th>Status</th><th></th></tr>
                </thead>
                <tbody>
                  {events.map((event) => (
                    <tr key={event.id}>
                      <td><strong>{event.title}</strong><div className="muted small">{event.certificate_prefix}</div></td>
                      <td>{formatDateId(event.event_date)}</td>
                      <td>{event.organizer}</td>
                      <td><span className={"badge " + (event.status === "active" ? "badge-valid" : "badge-draft")}>{event.status}</span></td>
                      <td style={{ textAlign: "right" }}><Link className="btn btn-secondary btn-small" href={"/admin/events/" + event.id}>Kelola</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="muted">Belum ada kegiatan. Buat kegiatan pertama untuk mulai menerbitkan sertifikat.</p>
          )}
        </section>
      </main>
    </>
  );
}
