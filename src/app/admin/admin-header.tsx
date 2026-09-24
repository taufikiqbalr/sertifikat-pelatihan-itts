import Link from "next/link";
import { logoutAction } from "./actions";

export default function AdminHeader({
  active
}: {
  active?: "dashboard" | "templates";
}) {
  return (
    <header className="topbar admin-topbar">
      <div className="container topbar-inner">
        <Link className="brand" href="/admin">
          <span className="brand-mark">SI</span>
          <span>
            Sertifikat ITTS
            <small>Certificate Management</small>
          </span>
        </Link>

        <div className="admin-nav-wrap">
          <nav className="admin-main-nav" aria-label="Navigasi admin">
            <Link className={active === "dashboard" ? "active" : ""} href="/admin">
              Kegiatan
            </Link>
            <Link
              className={active === "templates" ? "active" : ""}
              href="/admin/templates"
            >
              Template Sertifikat
            </Link>
          </nav>
          <form action={logoutAction}>
            <button className="btn btn-secondary btn-small" type="submit">
              Keluar
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
