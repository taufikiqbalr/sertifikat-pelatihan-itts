import type { Metadata } from "next";
import Link from "next/link";
import LoginForm from "./login-form";
import LoginIcon from "./login-icon";
import styles from "./login.module.css";

export const metadata: Metadata = {
  title: "Masuk Admin | Sertifikat ITTS",
  description: "Akses pengelolaan kegiatan, template, dan sertifikat digital ITTS.",
  robots: { index: false, follow: false }
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;

  return (
    <main className={styles.page}>
      <a className={styles.skipLink} href="#login-email">Langsung ke formulir masuk</a>
      <div className={styles.shell}>
        <header className={styles.header}>
          <Link href="/" className={styles.brand} aria-label="Sertifikat ITTS — beranda">
            <span className={styles.brandMark}><LoginIcon name="award" /></span>
            <span><strong>Sertifikat <span>ITTS</span></strong><small>Sistem sertifikat digital</small></span>
          </Link>
          <Link href="/" className={styles.backLink}><LoginIcon name="back" /><span>Kembali ke beranda</span></Link>
        </header>

        <div className={styles.frame}>
          <section className={styles.hero} aria-labelledby="login-hero-title">
            <span className={styles.heroEyebrow}><span /> WEBINAR · PELATIHAN · WORKSHOP</span>
            <h2 id="login-hero-title" className={styles.heroTitle}>Setiap pencapaian,<br /><span>layak diakui.</span></h2>
            <p className={styles.heroDescription}>Dari kegiatan hingga sertifikat terverifikasi.<br className={styles.desktopBreak} /> Semua terkelola, dalam satu tempat.</p>

            <div className={styles.illustration} aria-hidden="true">
              <div className={styles.paperBack} />
              <div className={styles.paper}>
                <div className={styles.paperTop}><span>ITTS</span><span>CONTOH TAMPILAN</span></div>
                <div className={styles.paperBody}>
                  <LoginIcon name="award" className={styles.paperAward} />
                  <span className={styles.paperTitle}>SERTIFIKAT</span>
                  <span className={styles.paperCaption}>Diberikan kepada</span>
                  <strong className={styles.paperName}>Nama Peserta</strong>
                  <span className={styles.paperRule} />
                  <span className={styles.paperDetail}>Atas partisipasi dalam kegiatan pelatihan ITTS</span>
                </div>
                <div className={styles.paperBottom}><span>Belajar. Berkembang. Berprestasi.</span><LoginIcon name="shield" /></div>
              </div>
              <div className={styles.verificationCard}>
                <span className={styles.verificationIcon}><LoginIcon name="qr" /></span>
                <span><strong>Verifikasi lewat QR</strong><small>Mudah diperiksa, mudah dipercaya.</small></span>
              </div>
            </div>

            <div className={styles.featureStrip}>
              <span><LoginIcon name="layers" />Template reusable</span>
              <span><LoginIcon name="award" />Penerbitan massal</span>
              <span><LoginIcon name="shield" />Validasi QR</span>
            </div>
          </section>

          <section className={styles.formPanel} aria-labelledby="login-title">
            <div className={styles.formContent}>
              <div className={styles.accessIcon}><LoginIcon name="lock" /></div>
              <span className={styles.eyebrow}>AKSES ADMINISTRATOR</span>
              <h1 id="login-title" className={styles.title}>Selamat datang <br />kembali.</h1>
              <p className={styles.subtitle}>Masuk untuk mengelola kegiatan dan sertifikat ITTS.</p>
              <LoginForm hasError={Boolean(error)} />

              <details className={styles.help}>
                <summary>Butuh bantuan masuk?</summary>
                <p>Gunakan akun admin yang diberikan oleh pengelola sistem. Untuk kendala akses atau penggantian password, hubungi pengelola sistem sertifikat ITTS.</p>
              </details>
              <div className={styles.securityNote}><LoginIcon name="shield" /><p>Akses khusus administrator.<br />Keluar dari akun setelah menggunakan perangkat bersama.</p></div>
            </div>
          </section>
        </div>

        <footer className={styles.footer}><span>Institut Teknologi Tangerang Selatan</span><span>Belajar hari ini. Bertumbuh untuk esok.</span></footer>
      </div>
    </main>
  );
}
