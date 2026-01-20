import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TOKENS_PATH = join(__dirname, "..", "tokens.json");

export interface LinkedInTokens {
  access_token: string;
  expires_at: number;
  refresh_token?: string;
}

export function loadTokens(): LinkedInTokens | null {
  if (!existsSync(TOKENS_PATH)) {
    return null;
  }
  try {
    const data = readFileSync(TOKENS_PATH, "utf-8");
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export function saveTokens(tokens: LinkedInTokens): void {
  writeFileSync(TOKENS_PATH, JSON.stringify(tokens, null, 2));
}

export function isTokenValid(tokens: LinkedInTokens | null): boolean {
  if (!tokens) return false;
  // Add 5 minute buffer
  return Date.now() < tokens.expires_at - 5 * 60 * 1000;
}

export function getAuthUrl(clientId: string, redirectUri: string): string {
  const scopes = ["openid", "profile", "w_member_social"];
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: scopes.join(" "),
  });
  return `https://www.linkedin.com/oauth/v2/authorization?${params}`;
}

export async function exchangeCodeForTokens(
  code: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string
): Promise<LinkedInTokens> {
  const response = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token exchange failed: ${error}`);
  }

  const data = await response.json();
  const tokens: LinkedInTokens = {
    access_token: data.access_token,
    expires_at: Date.now() + data.expires_in * 1000,
    refresh_token: data.refresh_token,
  };

  saveTokens(tokens);
  return tokens;
}
