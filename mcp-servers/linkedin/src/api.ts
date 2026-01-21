import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { loadTokens, isTokenValid, LinkedInTokens } from "./auth.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const POSTS_PATH = join(__dirname, "..", "posts.json");

const API_BASE = "https://api.linkedin.com/v2";
const API_REST = "https://api.linkedin.com/rest";

interface SavedPost {
  id: string;
  url: string;
  text: string;
  createdAt: string;
}

function loadSavedPosts(): SavedPost[] {
  if (!existsSync(POSTS_PATH)) {
    return [];
  }
  try {
    const data = readFileSync(POSTS_PATH, "utf-8");
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function savePost(post: SavedPost): void {
  const posts = loadSavedPosts();
  posts.unshift(post); // Add to beginning
  // Keep only last 50 posts
  const trimmed = posts.slice(0, 50);
  writeFileSync(POSTS_PATH, JSON.stringify(trimmed, null, 2));
}

interface LinkedInPostResponse {
  id: string;
  commentary?: string;
  createdAt?: number;
}

function getValidTokens(): LinkedInTokens {
  const tokens = loadTokens();
  if (!isTokenValid(tokens)) {
    throw new Error("Not authenticated. Run 'npm run auth' to connect LinkedIn.");
  }
  return tokens!;
}

function getHeaders(tokens: LinkedInTokens): Record<string, string> {
  return {
    Authorization: `Bearer ${tokens.access_token}`,
    "Content-Type": "application/json",
    "X-Restli-Protocol-Version": "2.0.0",
    "LinkedIn-Version": "202601",
  };
}

export async function getProfile(): Promise<{ sub: string; name: string }> {
  const tokens = getValidTokens();

  const response = await fetch(`${API_BASE}/userinfo`, {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });

  if (!response.ok) {
    throw new Error(`Failed to get profile: ${response.status}`);
  }

  return response.json();
}

export async function createTextPost(text: string): Promise<{ id: string; url: string }> {
  const tokens = getValidTokens();

  const profile = await getProfile();
  const authorUrn = `urn:li:person:${profile.sub}`;

  const response = await fetch(`${API_REST}/posts`, {
    method: "POST",
    headers: getHeaders(tokens),
    body: JSON.stringify({
      author: authorUrn,
      commentary: text,
      visibility: "PUBLIC",
      distribution: {
        feedDistribution: "MAIN_FEED",
        targetEntities: [],
        thirdPartyDistributionChannels: [],
      },
      lifecycleState: "PUBLISHED",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create post: ${error}`);
  }

  const postId = response.headers.get("x-restli-id") || "unknown";
  const url = `https://www.linkedin.com/feed/update/${postId}`;

  // Save post locally for future reference
  savePost({
    id: postId,
    url,
    text,
    createdAt: new Date().toISOString(),
  });

  return { id: postId, url };
}

export async function getPostAnalytics(
  postId: string
): Promise<{ impressions: number; likes: number; comments: number; shares: number }> {
  getValidTokens();

  // LinkedIn's analytics API requires specific permissions
  // For now, return placeholder - full implementation needs r_organization_social or similar
  return {
    impressions: 0,
    likes: 0,
    comments: 0,
    shares: 0,
  };
}

export async function listRecentPosts(): Promise<Array<{ id: string; url: string; text: string; createdAt: string }>> {
  // Return locally saved posts (LinkedIn API requires Marketing Developer Platform to read posts)
  const posts = loadSavedPosts();
  return posts.slice(0, 10).map((post) => ({
    id: post.id,
    url: post.url,
    text: post.text.length > 100 ? post.text.substring(0, 100) + "..." : post.text,
    createdAt: post.createdAt,
  }));
}
