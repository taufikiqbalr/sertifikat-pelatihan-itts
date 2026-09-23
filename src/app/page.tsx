import Link from "next/link";

export default function HomePage() {
  return (
    <>
      <header className="topbar">
        <div className="container topbar-inner">
          <Link className="brand" href="/">
            <span className="brand-mark">SI</span>
            <span>Sertifikat ITTS</span>
          </Link>
          <nav className="nav">
            <Link className="btn btn-secondary btn-small" href="/login">Admin</Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="container hero-grid">
            <div>
              <span className="eyebrow">✓ Sertifikat digital tervalidasi</span>
              <h1>Penerbitan sertifikat kegiatan yang rapi, cepat, dan dapat diverifikasi.</h1>
              <p className="lead">
                Kelola master webinar, pelatihan, workshop, atau seminar. Gunakan template
                sertifikat sendiri atau template default, terbitkan sertifikat peserta, lalu
                validasi keasliannya melalui QR Code.
              </p>
              <div className="actions">
                <Link className="btn btn-primary" href="/login">Masuk sebagai Admin</Link>
                <a className="btn btn-secondary" href="#fitur">Lihat Fitur</a>
              </div>
            </div>
            <div className="cert-mini">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/default-certificate.svg" alt="Contoh sertifikat ITTS" />
            </div>
          </div>
        </section>

        <section id="fitur" className="container" style={{ paddingBottom: 78 }}>
          <div className="grid-3">
            <div className="feature-card">
              <span className="feature-icon">01</span>
              <strong>Master per kegiatan</strong>
              <span className="muted">Nama kegiatan, tanggal, penyelenggara, penandatangan, prefix nomor, dan layout teks tersimpan per kegiatan.</span>
            </div>
            <div className="feature-card">
              <span className="feature-icon">02</span>
              <strong>Template fleksibel</strong>
              <span className="muted">Upload gambar sertifikat sendiri atau gunakan template bawaan. Posisi teks dan QR Code dapat diatur dari editor.</span>
            </div>
            <div className="feature-card">
              <span className="feature-icon">03</span>
              <strong>Validasi QR Code</strong>
              <span className="muted">Setiap sertifikat memiliki URL verifikasi publik yang menampilkan status valid atau dicabut.</span>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
