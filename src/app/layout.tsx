import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sertifikat ITTS",
  description: "Penerbitan dan validasi sertifikat kegiatan Institut Teknologi Tangerang Selatan"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
