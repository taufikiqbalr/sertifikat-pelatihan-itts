import Link from "next/link";
import { loginAction } from "./actions";

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="login-shell">
      <div className="card login-card">
        <Link className="brand" href="/">
          <span className="brand-mark">SI</span>
          <span>Sertifikat ITTS</span>
        </Link>
        <h1>Admin</h1>
        <p className="muted">Masuk untuk mengelola kegiatan, template, peserta, dan sertifikat.</p>

        {error ? <div className="alert alert-error" style={{ margin: "16px 0" }}>Email atau password tidak sesuai.</div> : null}

        <form action={loginAction} className="stack" style={{ marginTop: 20 }}>
          <div className="form-group">
            <label htmlFor="email">Email admin</label>
            <input className="input" id="email" name="email" type="email" required autoComplete="username" />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input className="input" id="password" name="password" type="password" required autoComplete="current-password" />
          </div>
          <button className="btn btn-primary" type="submit">Masuk</button>
        </form>
      </div>
    </main>
  );
}
