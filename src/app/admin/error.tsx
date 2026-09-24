"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function AdminError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[admin] route error", error);
  }, [error]);

  return (
    <main className="verify-shell">
      <div className="card verify-card">
        <div className="verify-icon revoked">!</div>
        <h1 style={{ fontSize: 36 }}>Admin mengalami error</h1>
        <p className="lead" style={{ margin: "0 auto" }}>
          Error sudah ditangkap agar halaman tidak berhenti tanpa informasi.
        </p>
        {error.digest ? (
          <div className="detail-item" style={{ marginTop: 20, textAlign: "center" }}>
            <span>Error digest</span>
            <strong>{error.digest}</strong>
          </div>
        ) : null}
        <div className="actions" style={{ justifyContent: "center" }}>
          <button className="btn btn-primary" type="button" onClick={reset}>
            Coba Lagi
          </button>
          <Link className="btn btn-secondary" href="/api/health" target="_blank">
            Health Check
          </Link>
          <Link className="btn btn-secondary" href="/login">
            Login Ulang
          </Link>
        </div>
      </div>
    </main>
  );
}
