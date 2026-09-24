import { NextResponse } from "next/server";
import { getAuthConfiguration } from "@/lib/auth";
import { checkDatabaseConnection } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const auth = getAuthConfiguration();
  const database = await checkDatabaseConnection();

  const result = {
    ok:
      auth.adminEmailConfigured &&
      auth.adminPasswordConfigured &&
      database.ok,
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "unknown",
    auth,
    database,
    blob: {
      configured: Boolean(process.env.BLOB_READ_WRITE_TOKEN)
    },
    appUrl: {
      configured: Boolean(process.env.NEXT_PUBLIC_APP_URL),
      usingVercelSystemUrl: Boolean(
        process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL
      )
    }
  };

  return NextResponse.json(result, {
    status: result.ok ? 200 : 503,
    headers: {
      "Cache-Control": "no-store"
    }
  });
}
