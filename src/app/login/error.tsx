"use client";

import Link from "next/link";
import LoginIcon from "./login-icon";
import styles from "./login.module.css";

export default function LoginError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className={styles.page}>
      <section className={styles.failurePanel} aria-labelledby="login-failure-title">
        <div className={styles.accessIcon}><LoginIcon name="alert" /></div>
        <span className={styles.eyebrow}>SERTIFIKAT ITTS</span>
        <h1 id="login-failure-title" className={styles.title}>Ada kendala saat masuk.</h1>
        <p className={styles.subtitle}>Permintaan belum dapat diproses. Coba lagi atau hubungi pengelola sistem apabila kendala berlanjut.</p>
        <button type="button" className={styles.submitButton} onClick={reset}>Coba lagi<LoginIcon name="arrow" /></button>
        <Link href="/" className={styles.backLink}><LoginIcon name="back" />Kembali ke beranda</Link>
      </section>
    </main>
  );
}
