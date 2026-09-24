import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import {
  getCertificate,
  getEvent,
  runQuery
} from "@/lib/db";
import {
  getGoogleDriveConfiguration,
  uploadCertificatePdf
} from "@/lib/google-drive";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_PDF_BYTES = 20 * 1024 * 1024;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdmin())) {
    return NextResponse.json(
      { error: "Sesi admin diperlukan untuk menyimpan ke Google Drive." },
      { status: 401 }
    );
  }

  const configuration = getGoogleDriveConfiguration();
  if (!configuration.configured) {
    return NextResponse.json(
      {
        error:
          "Google Drive belum dikonfigurasi pada environment Vercel."
      },
      { status: 503 }
    );
  }

  const { id } = await params;
  const certificate = await getCertificate(id);
  if (!certificate) {
    return NextResponse.json(
      { error: "Sertifikat tidak ditemukan." },
      { status: 404 }
    );
  }

  const event = await getEvent(certificate.event_id);
  if (!event) {
    return NextResponse.json(
      { error: "Kegiatan sertifikat tidak ditemukan." },
      { status: 404 }
    );
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "File PDF sertifikat wajib dikirim." },
      { status: 400 }
    );
  }

  if (file.type !== "application/pdf") {
    return NextResponse.json(
      { error: "Google Drive hanya menerima PDF dari endpoint ini." },
      { status: 415 }
    );
  }

  if (file.size <= 0 || file.size > MAX_PDF_BYTES) {
    return NextResponse.json(
      { error: "Ukuran PDF harus lebih dari 0 dan maksimal 20 MB." },
      { status: 413 }
    );
  }

  try {
    const pdf = Buffer.from(await file.arrayBuffer());
    const snapshot = certificate.issuance_snapshot || {};

    const uploaded = await uploadCertificatePdf({
      pdf,
      eventTitle: snapshot.event_title || event.title,
      eventDate: snapshot.event_date || event.event_date,
      participantName: certificate.participant_name,
      certificateNumber: certificate.certificate_number,
      existingFileId: certificate.drive_file_id,
      existingFolderId: certificate.drive_folder_id
    });

    const uploadedAt = new Date().toISOString();

    await runQuery(
      "UPDATE certificates SET " +
        "drive_file_id=$1, drive_file_name=$2, drive_folder_id=$3, " +
        "drive_web_view_link=$4, drive_uploaded_at=$5 WHERE id=$6",
      [
        uploaded.fileId,
        uploaded.fileName,
        uploaded.folderId,
        uploaded.webViewLink,
        uploadedAt,
        certificate.id
      ]
    );

    return NextResponse.json({
      ok: true,
      fileId: uploaded.fileId,
      fileName: uploaded.fileName,
      folderId: uploaded.folderId,
      webViewLink: uploaded.webViewLink,
      uploadedAt
    });
  } catch (error) {
    console.error("[google-drive] certificate upload failed", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Upload sertifikat ke Google Drive gagal."
      },
      { status: 500 }
    );
  }
}
