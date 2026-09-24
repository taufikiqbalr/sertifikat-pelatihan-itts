import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import styles from "./landing.module.css";

export const metadata: Metadata = {
  title: "Sertifikat Digital ITTS",
  description:
    "Platform penerbitan, pengelolaan, dan validasi sertifikat digital Institut Teknologi Tangerang Selatan."
};

const features = [
  {
    number: "01",
    title: "Template Library",
    description:
      "Kelola desain sertifikat sebagai master reusable. Satu template dapat digunakan oleh banyak kegiatan."
  },
  {
    number: "02",
    title: "Manajemen Kegiatan",
    description:
      "Atur nama kegiatan, tanggal, penyelenggara, penandatangan, prefix nomor, dan template yang digunakan."
  },
  {
    number: "03",
    title: "Penerbitan Batch",
    description:
      "Terbitkan sertifikat untuk banyak peserta sekaligus dengan nomor unik dan data peserta yang terstruktur."
  },
  {
    number: "04",
    title: "Validasi QR",
    description:
      "Setiap sertifikat memiliki QR Code dan halaman verifikasi publik yang menampilkan status valid atau dicabut."
  },
  {
    number: "05",
    title: "Immutable Versioning",
    description:
      "Sertifikat tetap menggunakan versi template saat diterbitkan meskipun desain master diperbarui kemudian."
  },
  {
    number: "06",
    title: "Audit Snapshot",
    description:
      "Data kegiatan disimpan saat penerbitan sehingga perubahan berikutnya tidak mengubah informasi sertifikat lama."
  }
];

const workflow = [
  {
    step: "01",
    title: "Buat kegiatan",
    description: "Lengkapi informasi kegiatan dan identitas penerbitan sertifikat."
  },
  {
    step: "02",
    title: "Pilih template",
    description: "Gunakan master template reusable atau buat desain baru dari Template Library."
  },
  {
    step: "03",
    title: "Terbitkan",
    description: "Masukkan daftar peserta dan terbitkan sertifikat secara batch."
  },
  {
    step: "04",
    title: "Verifikasi",
    description: "Peserta atau pihak ketiga dapat memindai QR dan memeriksa status sertifikat."
  }
];

function ArrowIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M4 10h11M11 6l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3 5.5 5.6v5.5c0 4.4 2.7 7.8 6.5 9.9 3.8-2.1 6.5-5.5 6.5-9.9V5.6L12 3Z" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="m9.2 12 1.8 1.8 3.9-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LayersIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m12 4 8 4-8 4-8-4 8-4Z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="m4 12 8 4 8-4M4 16l8 4 8-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

function QrIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4z" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M14 14h2v2h-2zM18 14h2v4h-2zM14 18h4v2h-4zM20 20h.1" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="5" y="10" width="14" height="10" rx="2" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

export default function HomePage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link className={styles.brand} href="/" aria-label="Sertifikat ITTS">
            <span className={styles.brandMark}>SI</span>
            <span className={styles.brandCopy}>
              <strong>Sertifikat ITTS</strong>
              <small>Digital Certificate Platform</small>
            </span>
          </Link>

          <nav className={styles.nav} aria-label="Navigasi utama">
            <a href="#fitur">Fitur</a>
            <a href="#alur">Alur</a>
            <a href="#validasi">Validasi</a>
          </nav>

          <Link className={styles.adminButton} href="/login" aria-label="Admin">
            <span>Admin</span>
            <ArrowIcon />
          </Link>
        </div>
      </header>

      <main>
        <section className={styles.hero}>
          <div className={styles.heroGlowOne} aria-hidden="true" />
          <div className={styles.heroGlowTwo} aria-hidden="true" />

          <div className={styles.heroGrid}>
            <div className={styles.heroCopy}>
              <div className={styles.eyebrow}>
                <span className={styles.eyebrowDot} />
                PLATFORM SERTIFIKAT DIGITAL ITTS
              </div>

              <h1>
                Sertifikat digital yang
                <span> rapi, valid, dan mudah dipercaya.</span>
              </h1>

              <p className={styles.heroLead}>
                Dari pengelolaan kegiatan, template reusable, penerbitan peserta,
                hingga verifikasi QR. Semua dikelola dalam satu sistem yang konsisten
                dan audit-ready.
              </p>

              <div className={styles.heroActions}>
                <Link className={styles.primaryCta} href="/login">
                  Masuk ke Dashboard
                  <ArrowIcon />
                </Link>
                <a className={styles.secondaryCta} href="#alur">
                  Lihat cara kerja
                </a>
              </div>

              <div className={styles.heroTrust}>
                <div>
                  <span className={styles.trustIcon}><ShieldIcon /></span>
                  <span><strong>QR Verification</strong><small>Validasi publik</small></span>
                </div>
                <div>
                  <span className={styles.trustIcon}><LayersIcon /></span>
                  <span><strong>Versioned Template</strong><small>Riwayat desain aman</small></span>
                </div>
                <div>
                  <span className={styles.trustIcon}><LockIcon /></span>
                  <span><strong>Audit Snapshot</strong><small>Data penerbitan terkunci</small></span>
                </div>
              </div>
            </div>

            <div className={styles.heroVisual} aria-label="Preview platform sertifikat ITTS">
              <div className={styles.visualPanel}>
                <div className={styles.visualTopbar}>
                  <div className={styles.windowDots} aria-hidden="true">
                    <span />
                    <span />
                    <span />
                  </div>
                  <span className={styles.visualLabel}>Certificate Workspace</span>
                  <span className={styles.liveBadge}><i /> LIVE</span>
                </div>

                <div className={styles.visualBody}>
                  <div className={styles.certificateFrame}>
                    <Image
                      src="/default-certificate.svg"
                      alt="Contoh desain sertifikat ITTS"
                      width={1123}
                      height={794}
                      priority
                    />
                    <span className={styles.versionChip}>Template v3</span>
                  </div>

                  <div className={styles.visualSidebar}>
                    <div className={styles.sideCard}>
                      <span className={styles.sideLabel}>Status</span>
                      <div className={styles.validStatus}>
                        <span>✓</span>
                        <strong>VALID</strong>
                      </div>
                    </div>

                    <div className={styles.sideCard}>
                      <span className={styles.sideLabel}>Validasi</span>
                      <div className={styles.qrMock} aria-hidden="true">
                        <QrIcon />
                      </div>
                      <small>Scan QR untuk verifikasi</small>
                    </div>

                    <div className={styles.sideCard}>
                      <span className={styles.sideLabel}>Peserta</span>
                      <strong>Nama Peserta</strong>
                      <small>ITTS/CERT/2026/0001</small>
                    </div>
                  </div>
                </div>
              </div>

              <div className={styles.floatingVerified}>
                <span className={styles.verifiedIcon}>✓</span>
                <span>
                  <strong>Sertifikat terverifikasi</strong>
                  <small>Data cocok dengan sistem ITTS</small>
                </span>
              </div>

              <div className={styles.floatingTemplate}>
                <span className={styles.templateIcon}><LayersIcon /></span>
                <span>
                  <strong>Template reusable</strong>
                  <small>Satu desain, banyak kegiatan</small>
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.capabilityStrip} aria-label="Kapabilitas utama">
          <div className={styles.capabilityInner}>
            <span>Template Library</span>
            <i />
            <span>Batch Issuance</span>
            <i />
            <span>Immutable Versioning</span>
            <i />
            <span>QR Validation</span>
            <i />
            <span>PDF & PNG Export</span>
          </div>
        </section>

        <section id="fitur" className={styles.section}>
          <div className={styles.sectionHeader}>
            <div>
              <span className={styles.sectionEyebrow}>KAPABILITAS</span>
              <h2>Satu platform untuk seluruh siklus sertifikat.</h2>
            </div>
            <p>
              Dibangun untuk menangani proses dari desain hingga validasi tanpa
              mengorbankan konsistensi data sertifikat yang sudah diterbitkan.
            </p>
          </div>

          <div className={styles.featureGrid}>
            {features.map((feature) => (
              <article className={styles.featureCard} key={feature.number}>
                <div className={styles.featureCardTop}>
                  <span className={styles.featureNumber}>{feature.number}</span>
                  <span className={styles.featureArrow}>↗</span>
                </div>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="alur" className={styles.workflowSection}>
          <div className={styles.workflowInner}>
            <div className={styles.workflowIntro}>
              <span className={styles.sectionEyebrow}>ALUR KERJA</span>
              <h2>Dari kegiatan menjadi sertifikat terverifikasi.</h2>
              <p>
                Proses dirancang sederhana untuk administrator, tetapi tetap menjaga
                jejak versi dan informasi penerbitan untuk setiap sertifikat.
              </p>
              <Link className={styles.textLink} href="/login">
                Mulai dari Dashboard
                <ArrowIcon />
              </Link>
            </div>

            <div className={styles.workflowList}>
              {workflow.map((item, index) => (
                <div className={styles.workflowItem} key={item.step}>
                  <div className={styles.workflowMarker}>
                    <span>{item.step}</span>
                    {index < workflow.length - 1 ? <i /> : null}
                  </div>
                  <div className={styles.workflowCopy}>
                    <h3>{item.title}</h3>
                    <p>{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="validasi" className={styles.validationSection}>
          <div className={styles.validationGrid}>
            <div className={styles.validationMock}>
              <div className={styles.validationCard}>
                <div className={styles.validationCheck}>✓</div>
                <span className={styles.validationBadge}>SERTIFIKAT VALID</span>
                <h3>Nama Peserta</h3>
                <p>Sertifikat tercatat pada sistem dan statusnya valid.</p>

                <div className={styles.validationDetails}>
                  <div><span>Nomor Sertifikat</span><strong>ITTS/CERT/2026/0001</strong></div>
                  <div><span>Nama Kegiatan</span><strong>Pelatihan Teknologi ITTS</strong></div>
                  <div><span>Versi Template</span><strong>v3</strong></div>
                  <div><span>ID Validasi</span><strong>A24F9C0D...</strong></div>
                </div>
              </div>
            </div>

            <div className={styles.validationCopy}>
              <span className={styles.sectionEyebrow}>PUBLIC VERIFICATION</span>
              <h2>Keaslian sertifikat dapat diperiksa dalam hitungan detik.</h2>
              <p>
                QR Code pada setiap sertifikat mengarah ke halaman verifikasi publik.
                Pengguna dapat melihat identitas sertifikat, kegiatan, tanggal terbit,
                versi template, serta status valid atau dicabut.
              </p>

              <div className={styles.validationPoints}>
                <div><span>✓</span><p>Tanpa perlu login untuk memeriksa keaslian.</p></div>
                <div><span>✓</span><p>Status pencabutan tetap terlihat pada halaman validasi.</p></div>
                <div><span>✓</span><p>Sertifikat lama tetap mempertahankan versi desain saat diterbitkan.</p></div>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.ctaSection}>
          <div className={styles.ctaCard}>
            <div className={styles.ctaGlow} aria-hidden="true" />
            <div>
              <span className={styles.ctaEyebrow}>CERTIFICATE MANAGEMENT</span>
              <h2>Kelola sertifikat ITTS dengan alur yang lebih rapi.</h2>
              <p>
                Masuk ke dashboard untuk membuat kegiatan, mengelola template,
                menerbitkan sertifikat, dan memantau status validasinya.
              </p>
            </div>

            <Link className={styles.ctaButton} href="/login">
              Masuk sebagai Admin
              <ArrowIcon />
            </Link>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerBrand}>
            <span className={styles.brandMark}>SI</span>
            <span>
              <strong>Sertifikat ITTS</strong>
              <small>Institut Teknologi Tangerang Selatan</small>
            </span>
          </div>

          <p>
            Penerbitan dan validasi sertifikat digital untuk kegiatan ITTS.
          </p>

          <div className={styles.footerLinks}>
            <a href="#fitur">Fitur</a>
            <a href="#alur">Alur</a>
            <Link href="/login">Admin</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
