import { createServer } from "node:http";
import { google } from "googleapis";

const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID?.trim();
const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET?.trim();
const port = Number(process.env.GOOGLE_DRIVE_AUTH_PORT || 53682);
const redirectUri = `http://127.0.0.1:${port}/oauth2callback`;

if (!clientId || !clientSecret) {
  console.error(
    "Set GOOGLE_DRIVE_CLIENT_ID and GOOGLE_DRIVE_CLIENT_SECRET before running this helper."
  );
  process.exit(1);
}

const oauth2 = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
const scope = "https://www.googleapis.com/auth/drive";

const authUrl = oauth2.generateAuthUrl({
  access_type: "offline",
  prompt: "consent",
  scope: [scope]
});

console.log("\nGoogle Drive OAuth setup");
console.log("========================");
console.log("1. In Google Cloud OAuth client, add this Authorized redirect URI:");
console.log("   " + redirectUri);
console.log("2. Open this URL and sign in with the Google account that will own the PDFs:");
console.log("\n" + authUrl + "\n");
console.log("Waiting for OAuth callback...");

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url || "/", redirectUri);

    if (url.pathname !== "/oauth2callback") {
      response.writeHead(404);
      response.end("Not found");
      return;
    }

    const error = url.searchParams.get("error");
    if (error) {
      response.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Google authorization failed: " + error);
      server.close();
      return;
    }

    const code = url.searchParams.get("code");
    if (!code) {
      response.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Authorization code not found.");
      return;
    }

    const { tokens } = await oauth2.getToken(code);

    response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    response.end(
      "<h2>Google Drive connected.</h2><p>You can close this browser tab and return to the terminal.</p>"
    );

    console.log("\nAuthorization successful.");
    console.log("Add this value to Vercel as GOOGLE_DRIVE_REFRESH_TOKEN:");
    console.log("\n" + (tokens.refresh_token || "(no refresh token returned)") + "\n");

    if (!tokens.refresh_token) {
      console.log(
        "If no refresh token was returned, revoke the app permission in the Google account and run this helper again."
      );
    }

    server.close();
  } catch (error) {
    console.error("OAuth token exchange failed:", error);
    response.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("OAuth token exchange failed.");
    server.close();
  }
});

server.listen(port, "127.0.0.1");
