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
  "List your recent LinkedIn posts (up to 10, from local storage)",
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
