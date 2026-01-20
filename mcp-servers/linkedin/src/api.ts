import { loadTokens, isTokenValid, LinkedInTokens } from "./auth.js";

const API_BASE = "https://api.linkedin.com/v2";
const API_REST = "https://api.linkedin.com/rest";

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
    "LinkedIn-Version": "202401",
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
  return {
    id: postId,
    url: `https://www.linkedin.com/feed/update/${postId}`,
  };
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

export async function listRecentPosts(): Promise<Array<{ id: string; text: string; created: string }>> {
  const tokens = getValidTokens();

  const profile = await getProfile();
  const authorUrn = `urn:li:person:${profile.sub}`;

  const response = await fetch(
    `${API_REST}/posts?author=${encodeURIComponent(authorUrn)}&q=author&count=10`,
    {
      headers: getHeaders(tokens),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to list posts: ${error}`);
  }

  const data = await response.json();
  return (data.elements || []).map((post: LinkedInPostResponse) => ({
    id: post.id,
    text: post.commentary?.substring(0, 100) || "",
    created: post.createdAt ? new Date(post.createdAt).toISOString() : "unknown",
  }));
}
