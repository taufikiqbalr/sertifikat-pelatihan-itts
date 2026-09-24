import Link from "next/link";
import BrandLogo from "../../brand-logo";
import { notFound } from "next/navigation";
import {
  getCertificate,
  getCertificateRenderTemplate,
  getEvent
} from "@/lib/db";
import CertificateView from "./view";

export const dynamic = "force-dynamic";

export default async function CertificatePage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const certificate = await getCertificate(id);
  if (!certificate) notFound();

  const [event, templateVersion] = await Promise.all([
    getEvent(certificate.event_id),
    getCertificateRenderTemplate(certificate.id)
  ]);

  if (!event || !templateVersion) notFound();

  return (
    <>
      <header className="topbar">
        <div className="container topbar-inner">
          <Link className="brand" href="/">
            <BrandLogo className="brand-logo-header" />
            <span>Sertifikat ITTS</span>
          </Link>
          <Link
            className="btn btn-secondary btn-small"
            href={"/verify/" + certificate.public_id}
          >
            Validasi
          </Link>
        </div>
      </header>
      <main className="container page">
        <CertificateView
          certificate={certificate}
          event={event}
          templateVersion={templateVersion}
        />
      </main>
    </>
  );
}
