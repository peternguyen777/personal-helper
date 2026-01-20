import { createServer } from "http";
import { URL } from "url";
import open from "open";
import { getAuthUrl, exchangeCodeForTokens } from "./auth.js";

const CLIENT_ID = process.env.LINKEDIN_CLIENT_ID;
const CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET;
const REDIRECT_URI = process.env.LINKEDIN_REDIRECT_URI || "http://localhost:3000/callback";

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("Error: LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET must be set");
  console.error("Create a .env file with your LinkedIn app credentials");
  process.exit(1);
}

const PORT = new URL(REDIRECT_URI).port || 3000;

const server = createServer(async (req, res) => {
  const url = new URL(req.url || "", `http://localhost:${PORT}`);

  if (url.pathname === "/callback") {
    const code = url.searchParams.get("code");
    const error = url.searchParams.get("error");

    if (error) {
      res.writeHead(400, { "Content-Type": "text/html" });
      res.end(`<h1>Error</h1><p>${error}</p>`);
      server.close();
      process.exit(1);
    }

    if (code) {
      try {
        await exchangeCodeForTokens(code, CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end("<h1>Success!</h1><p>You can close this window. LinkedIn is now connected.</p>");
        console.log("\nAuthentication successful! Tokens saved.");
        server.close();
        process.exit(0);
      } catch (err) {
        res.writeHead(500, { "Content-Type": "text/html" });
        res.end(`<h1>Error</h1><p>${err}</p>`);
        server.close();
        process.exit(1);
      }
    }
  }

  res.writeHead(404);
  res.end();
});

server.listen(PORT, () => {
  const authUrl = getAuthUrl(CLIENT_ID, REDIRECT_URI);
  console.log(`Opening browser for LinkedIn authorization...`);
  console.log(`If browser doesn't open, visit: ${authUrl}`);
  open(authUrl);
});
