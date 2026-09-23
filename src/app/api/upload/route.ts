import crypto from "node:crypto";
import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "File tidak ditemukan." }, { status: 400 });
  }

  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
    return NextResponse.json({ error: "Format harus PNG, JPG, atau WebP." }, { status: 400 });
  }

  if (file.size > 4 * 1024 * 1024) {
    return NextResponse.json({ error: "Ukuran file maksimal 4 MB." }, { status: 400 });
  }

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const blob = await put("certificate-templates/" + crypto.randomUUID() + "." + ext, file, {
      access: "public",
      addRandomSuffix: false
    });
    return NextResponse.json({ url: blob.url, storage: "vercel-blob" });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const url = "data:" + file.type + ";base64," + buffer.toString("base64");
  return NextResponse.json({ url, storage: "database-inline" });
}
