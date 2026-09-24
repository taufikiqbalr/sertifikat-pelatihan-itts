import "server-only";

import { Readable } from "node:stream";
import { google, type drive_v3 } from "googleapis";

const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive";
const FOLDER_MIME = "application/vnd.google-apps.folder";

export type GoogleDriveConfiguration = {
  configured: boolean;
  mode: "oauth-user" | "service-account" | "none";
  rootFolderConfigured: boolean;
  rootFolderName: string;
  impersonationConfigured: boolean;
};

export function getGoogleDriveConfiguration(): GoogleDriveConfiguration {
  const oauthConfigured = Boolean(
    process.env.GOOGLE_DRIVE_CLIENT_ID?.trim() &&
      process.env.GOOGLE_DRIVE_CLIENT_SECRET?.trim() &&
      process.env.GOOGLE_DRIVE_REFRESH_TOKEN?.trim()
  );

  const serviceAccountConfigured = Boolean(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim() &&
      process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.trim()
  );

  return {
    configured: oauthConfigured || serviceAccountConfigured,
    mode: oauthConfigured
      ? "oauth-user"
      : serviceAccountConfigured
        ? "service-account"
        : "none",
    rootFolderConfigured: Boolean(process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID?.trim()),
    rootFolderName:
      process.env.GOOGLE_DRIVE_ROOT_FOLDER_NAME?.trim() ||
      "Sertifikat Pelatihan ITTS",
    impersonationConfigured: Boolean(
      process.env.GOOGLE_DRIVE_IMPERSONATE_USER?.trim()
    )
  };
}

function normalizePrivateKey(value: string) {
  return value.replace(/\\n/g, "\n");
}

function driveClient() {
  const config = getGoogleDriveConfiguration();

  if (config.mode === "oauth-user") {
    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_DRIVE_CLIENT_ID!.trim(),
      process.env.GOOGLE_DRIVE_CLIENT_SECRET!.trim()
    );

    auth.setCredentials({
      refresh_token: process.env.GOOGLE_DRIVE_REFRESH_TOKEN!.trim()
    });

    return google.drive({ version: "v3", auth });
  }

  if (config.mode === "service-account") {
    const auth = new google.auth.JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL!.trim(),
      key: normalizePrivateKey(
        process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY!.trim()
      ),
      scopes: [DRIVE_SCOPE],
      subject: process.env.GOOGLE_DRIVE_IMPERSONATE_USER?.trim() || undefined
    });

    return google.drive({ version: "v3", auth });
  }

  throw new Error(
    "Google Drive belum dikonfigurasi. Gunakan OAuth user atau service account."
  );
}

function escapeQueryValue(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function sanitizeDriveName(value: string) {
  return value
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);
}

async function findFolder(
  drive: drive_v3.Drive,
  parentId: string,
  name: string
) {
  const escapedName = escapeQueryValue(name);
  const escapedParent = escapeQueryValue(parentId);

  const result = await drive.files.list({
    q:
      "'" +
      escapedParent +
      "' in parents and trashed=false and mimeType='" +
      FOLDER_MIME +
      "' and name='" +
      escapedName +
      "'",
    fields: "files(id,name,webViewLink)",
    spaces: "drive",
    pageSize: 10,
    includeItemsFromAllDrives: true,
    supportsAllDrives: true
  });

  return result.data.files?.[0] ?? null;
}

async function createFolder(
  drive: drive_v3.Drive,
  parentId: string,
  name: string
) {
  const result = await drive.files.create({
    requestBody: {
      name,
      mimeType: FOLDER_MIME,
      parents: [parentId]
    },
    fields: "id,name,webViewLink",
    supportsAllDrives: true
  });

  if (!result.data.id) {
    throw new Error("Google Drive tidak mengembalikan ID folder.");
  }

  return result.data;
}

async function ensureFolder(
  drive: drive_v3.Drive,
  parentId: string,
  name: string
) {
  const existing = await findFolder(drive, parentId, name);
  if (existing?.id) return existing;
  return createFolder(drive, parentId, name);
}

async function resolveRootFolder(drive: drive_v3.Drive) {
  const config = getGoogleDriveConfiguration();
  const explicitRoot = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID?.trim();

  if (explicitRoot) {
    return explicitRoot;
  }

  if (config.mode === "service-account" && !config.impersonationConfigured) {
    throw new Error(
      "Service account tanpa impersonation memerlukan GOOGLE_DRIVE_ROOT_FOLDER_ID pada Shared Drive."
    );
  }

  const folder = await ensureFolder(drive, "root", config.rootFolderName);
  return folder.id!;
}

function isNotFound(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const candidate = error as {
    code?: number;
    response?: { status?: number };
  };
  return candidate.code === 404 || candidate.response?.status === 404;
}

export async function uploadCertificatePdf({
  pdf,
  eventTitle,
  eventDate,
  participantName,
  certificateNumber,
  existingFileId,
  existingFolderId
}: {
  pdf: Buffer;
  eventTitle: string;
  eventDate: string;
  participantName: string;
  certificateNumber: string;
  existingFileId?: string | null;
  existingFolderId?: string | null;
}) {
  const drive = driveClient();
  const rootFolderId = await resolveRootFolder(drive);

  const eventFolderName = sanitizeDriveName(
    eventDate + " - " + eventTitle
  );

  const eventFolderId =
    existingFolderId ||
    (await ensureFolder(drive, rootFolderId, eventFolderName)).id!;

  const fileName =
    sanitizeDriveName(
      certificateNumber + " - " + participantName
    ) + ".pdf";

  const media = {
    mimeType: "application/pdf",
    body: Readable.from(pdf)
  };

  if (existingFileId) {
    try {
      const updated = await drive.files.update({
        fileId: existingFileId,
        requestBody: { name: fileName },
        media,
        fields: "id,name,webViewLink,parents",
        supportsAllDrives: true
      });

      return {
        fileId: updated.data.id!,
        fileName: updated.data.name || fileName,
        folderId: eventFolderId,
        webViewLink:
          updated.data.webViewLink ||
          "https://drive.google.com/file/d/" + updated.data.id + "/view"
      };
    } catch (error) {
      if (!isNotFound(error)) throw error;
    }
  }

  const created = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [eventFolderId],
      mimeType: "application/pdf",
      appProperties: {
        source: "sertifikat-pelatihan-itts",
        certificateNumber: certificateNumber.slice(0, 120)
      }
    },
    media,
    fields: "id,name,webViewLink,parents",
    supportsAllDrives: true
  });

  if (!created.data.id) {
    throw new Error("Google Drive tidak mengembalikan ID file.");
  }

  return {
    fileId: created.data.id,
    fileName: created.data.name || fileName,
    folderId: eventFolderId,
    webViewLink:
      created.data.webViewLink ||
      "https://drive.google.com/file/d/" + created.data.id + "/view"
  };
}
