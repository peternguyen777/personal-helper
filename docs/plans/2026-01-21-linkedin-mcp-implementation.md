# LinkedIn MCP Server & Skill Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build an MCP server for LinkedIn API integration and a skill for drafting/posting content.

**Architecture:** MCP server with OAuth 2.0 flow, token persistence, and tools for posting/analytics. Skill file orchestrates the draft-review-post workflow.

**Tech Stack:** TypeScript, @modelcontextprotocol/sdk, Zod, LinkedIn API v2

---

## Task 1: Project Setup

**Files:**
- Create: `mcp-servers/linkedin/package.json`
- Create: `mcp-servers/linkedin/tsconfig.json`
- Create: `mcp-servers/linkedin/.env.example`
- Create: `mcp-servers/linkedin/.gitignore`

**Step 1: Create directory structure**

```bash
mkdir -p mcp-servers/linkedin/src
```

**Step 2: Create package.json**

```json
{
  "name": "linkedin-mcp-server",
  "version": "1.0.0",
  "description": "MCP server for LinkedIn API - posting, analytics, comments",
  "type": "module",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "auth": "node dist/auth-cli.js"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "open": "^10.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0"
  }
}
```

**Step 3: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true
  },
  "include": ["src/**/*"]
}
```

**Step 4: Create .env.example**

```bash
LINKEDIN_CLIENT_ID=your_client_id
LINKEDIN_CLIENT_SECRET=your_client_secret
LINKEDIN_REDIRECT_URI=http://localhost:3000/callback
```

**Step 5: Create .gitignore**

```
node_modules/
dist/
.env
tokens.json
```

**Step 6: Install dependencies**

```bash
cd mcp-servers/linkedin && npm install
```

**Step 7: Commit**

```bash
git add mcp-servers/linkedin/
git commit -m "feat(linkedin): initialize MCP server project structure"
```

---

## Task 2: OAuth Token Management

**Files:**
- Create: `mcp-servers/linkedin/src/auth.ts`

**Step 1: Create auth.ts with token types and storage**

```typescript
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
```

**Step 2: Commit**

```bash
git add mcp-servers/linkedin/src/auth.ts
git commit -m "feat(linkedin): add OAuth token management"
```

---

## Task 3: Auth CLI Tool

**Files:**
- Create: `mcp-servers/linkedin/src/auth-cli.ts`

**Step 1: Create auth-cli.ts for initial OAuth flow**

```typescript
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
```

**Step 2: Build and test auth flow**

```bash
cd mcp-servers/linkedin && npm run build
```

**Step 3: Commit**

```bash
git add mcp-servers/linkedin/src/auth-cli.ts
git commit -m "feat(linkedin): add CLI tool for OAuth authentication"
```

---

## Task 4: LinkedIn API Client

**Files:**
- Create: `mcp-servers/linkedin/src/api.ts`

**Step 1: Create api.ts with LinkedIn API methods**

```typescript
import { loadTokens, isTokenValid, LinkedInTokens } from "./auth.js";

const API_BASE = "https://api.linkedin.com/v2";
const API_REST = "https://api.linkedin.com/rest";

function getHeaders(tokens: LinkedInTokens): Record<string, string> {
  return {
    Authorization: `Bearer ${tokens.access_token}`,
    "Content-Type": "application/json",
    "X-Restli-Protocol-Version": "2.0.0",
    "LinkedIn-Version": "202401",
  };
}

export async function getProfile(): Promise<{ sub: string; name: string }> {
  const tokens = loadTokens();
  if (!isTokenValid(tokens)) {
    throw new Error("Not authenticated. Run 'npm run auth' to connect LinkedIn.");
  }

  const response = await fetch("https://api.linkedin.com/v2/userinfo", {
    headers: { Authorization: `Bearer ${tokens!.access_token}` },
  });

  if (!response.ok) {
    throw new Error(`Failed to get profile: ${response.status}`);
  }

  return response.json();
}

export async function createTextPost(text: string): Promise<{ id: string; url: string }> {
  const tokens = loadTokens();
  if (!isTokenValid(tokens)) {
    throw new Error("Not authenticated. Run 'npm run auth' to connect LinkedIn.");
  }

  const profile = await getProfile();
  const authorUrn = `urn:li:person:${profile.sub}`;

  const response = await fetch(`${API_REST}/posts`, {
    method: "POST",
    headers: getHeaders(tokens!),
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
  const tokens = loadTokens();
  if (!isTokenValid(tokens)) {
    throw new Error("Not authenticated. Run 'npm run auth' to connect LinkedIn.");
  }

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
  const tokens = loadTokens();
  if (!isTokenValid(tokens)) {
    throw new Error("Not authenticated. Run 'npm run auth' to connect LinkedIn.");
  }

  const profile = await getProfile();
  const authorUrn = `urn:li:person:${profile.sub}`;

  const response = await fetch(
    `${API_REST}/posts?author=${encodeURIComponent(authorUrn)}&q=author&count=10`,
    {
      headers: getHeaders(tokens!),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to list posts: ${error}`);
  }

  const data = await response.json();
  return (data.elements || []).map((post: any) => ({
    id: post.id,
    text: post.commentary?.substring(0, 100) || "",
    created: post.createdAt ? new Date(post.createdAt).toISOString() : "unknown",
  }));
}
```

**Step 2: Commit**

```bash
git add mcp-servers/linkedin/src/api.ts
git commit -m "feat(linkedin): add LinkedIn API client for posts"
```

---

## Task 5: MCP Server Entry Point

**Files:**
- Create: `mcp-servers/linkedin/src/index.ts`

**Step 1: Create index.ts with MCP tools**

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { createTextPost, listRecentPosts, getPostAnalytics, getProfile } from "./api.js";
import { loadTokens, isTokenValid } from "./auth.js";

const server = new McpServer({
  name: "linkedin",
  version: "1.0.0",
});

// Check auth status tool
server.tool(
  "linkedin_auth_status",
  "Check if LinkedIn is authenticated and tokens are valid",
  {},
  async () => {
    const tokens = loadTokens();
    const valid = isTokenValid(tokens);

    if (!valid) {
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              authenticated: false,
              message: "Not authenticated. Run 'cd mcp-servers/linkedin && npm run auth' to connect.",
            }),
          },
        ],
      };
    }

    try {
      const profile = await getProfile();
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              authenticated: true,
              name: profile.name,
              expires_at: new Date(tokens!.expires_at).toISOString(),
            }),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              authenticated: false,
              error: error instanceof Error ? error.message : "Unknown error",
            }),
          },
        ],
        isError: true,
      };
    }
  }
);

// Create post tool
server.tool(
  "create_post",
  "Create a text post on LinkedIn. Returns post ID and URL.",
  {
    text: z.string().describe("The post content (max 3000 characters)"),
  },
  async ({ text }) => {
    try {
      if (text.length > 3000) {
        throw new Error("Post text exceeds 3000 character limit");
      }
      const result = await createTextPost(text);
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// List recent posts tool
server.tool(
  "list_recent_posts",
  "List your recent LinkedIn posts (up to 10)",
  {},
  async () => {
    try {
      const posts = await listRecentPosts();
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(posts, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// Get post analytics tool
server.tool(
  "get_post_analytics",
  "Get engagement analytics for a specific post",
  {
    post_id: z.string().describe("The LinkedIn post ID"),
  },
  async ({ post_id }) => {
    try {
      const analytics = await getPostAnalytics(post_id);
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(analytics, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
          },
        ],
        isError: true,
      };
    }
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
```

**Step 2: Build the server**

```bash
cd mcp-servers/linkedin && npm run build
```

**Step 3: Commit**

```bash
git add mcp-servers/linkedin/src/index.ts
git commit -m "feat(linkedin): add MCP server with posting and analytics tools"
```

---

## Task 6: Claude Desktop Configuration

**Files:**
- Modify: `~/.config/claude/claude_desktop_config.json` (or equivalent)

**Step 1: Add linkedin MCP server to Claude config**

Add to the `mcpServers` section:

```json
{
  "mcpServers": {
    "linkedin": {
      "command": "node",
      "args": ["/Users/peternguyen/Personal/personal-helper/mcp-servers/linkedin/dist/index.js"],
      "env": {
        "LINKEDIN_CLIENT_ID": "your_client_id",
        "LINKEDIN_CLIENT_SECRET": "your_client_secret"
      }
    }
  }
}
```

**Step 2: Test the connection**

Restart Claude Desktop/CLI and verify the linkedin tools appear.

---

## Task 7: Create the Skill File

**Files:**
- Create: `.claude/skills/linkedin-post.md`

**Step 1: Create the skill file**

```markdown
---
name: linkedin-post
description: Use when asked to draft, suggest, or post LinkedIn content
---

# LinkedIn Post Skill

Draft, review, and post content to LinkedIn with algorithm optimization.

## Prerequisites

- `linkedin` MCP server authenticated (run `cd mcp-servers/linkedin && npm run auth` if needed)

## Style Guidelines

- Casual personal storytelling (not thought-leader cringe)
- Short and punchy (2-4 paragraphs)
- Strong opening hook that creates curiosity
- No emojis, no em dashes
- 3-5 relevant hashtags at bottom (PascalCase)
- No links in main post body (suggest adding to comments)
- Narrative over advice ("here's a thing that happened" not "here's my framework")

## Workflow

### Mode 1: You Provide Topic

1. User says "Draft a LinkedIn post about [topic]"
2. Write draft following style guidelines
3. Show preview with character count
4. Ask: "Ready to post, want edits, or scrap it?"
5. If edits requested, revise and show again
6. If approved, check posting time and post via MCP

### Mode 2: Suggest Topics

1. User says "Suggest LinkedIn topics"
2. Optionally check recent git commits for inspiration:
   ```bash
   git log --oneline -10
   ```
3. Generate 3-5 casual narrative angles (NOT lessons/frameworks)
4. Present as story starters, not thought leadership
5. User picks one, proceed to drafting

### Mode 3: Post Approved Content

1. User approves draft
2. Check current time against optimal windows:
   - 8-10am (pre-meeting scroll)
   - 12-2pm (lunch break)
   - 5-7pm (end of day)
   - Best days: Tue/Wed/Thu
3. If off-peak, mention: "It's [time] - want to post now or wait for [next window]?"
4. Use `create_post` MCP tool
5. Return post URL

## Topic Domain

PM in AI, software/tech career, product thinking, relatable work moments, small observations, funny mishaps.

## Post Structure

```
[Hook - first line that creates curiosity or relatability]

[Short story or observation - 2-3 sentences max]

[Optional: one more beat or punchline]

#RelevantHashtag #AnotherOne #MaybeOneMore
```

## What NOT to Do

- No "I learned that..." openings
- No numbered lists of advice
- No "Here's my framework for..."
- No engagement bait ("Comment if you agree!")
- No humble brags disguised as stories
- No em dashes
- No emojis

## Example Post

```
Spent 20 minutes in a meeting trying to sound smart about a feature I'd never heard of.

Turns out it was something I built last quarter. Just with a different name now.

Product management is mostly just keeping track of what things are called this week.

#ProductManagement #TechLife
```
```

**Step 2: Commit**

```bash
git add .claude/skills/linkedin-post.md
git commit -m "feat: add linkedin-post skill for draft-review-post workflow"
```

---

## Task 8: End-to-End Test

**Step 1: Authenticate with LinkedIn**

```bash
cd mcp-servers/linkedin
cp .env.example .env
# Edit .env with your LinkedIn app credentials
npm run auth
```

**Step 2: Test posting flow**

In Claude, say: "Draft a LinkedIn post about my first week using AI coding tools"

Verify:
- Draft follows style guidelines
- Review loop works
- Posting creates actual LinkedIn post
- URL is returned

**Step 3: Final commit**

```bash
git add -A
git commit -m "feat(linkedin): complete MCP server and skill implementation"
```

---

## Future Enhancements (Not in Scope)

- Image/carousel posting (`create_post_with_image`, `create_carousel`)
- Comment fetching and replies (`get_comments`, `reply_to_comment`)
- Full analytics (requires additional LinkedIn API permissions)
- Scheduled posting
