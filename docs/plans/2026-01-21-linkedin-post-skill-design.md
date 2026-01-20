# LinkedIn Post Skill Design

## Overview

A skill to automate LinkedIn posts via Claude Code with a draft → review → post workflow.

**Trigger:** "Draft a LinkedIn post about X", "Suggest LinkedIn topics", "Post to LinkedIn"

## Style Guidelines

- Casual personal storytelling (not thought-leader cringe)
- Short and punchy (2-4 paragraphs)
- Strong opening hook
- No emojis, no em dashes
- 3-5 relevant hashtags at bottom
- No links in main post (suggest adding to comments)
- Narrative over advice ("here's a thing that happened" not "here's my framework")

**Topic domain:** PM in AI, software/tech career, product thinking, relatable work moments

## Workflow

### 1. Draft mode (user provides topic)

```
User: "Draft a LinkedIn post about [topic]"

Claude:
- Writes draft following style guidelines
- Shows preview with character count
- Asks: "Ready to post, want edits, or scrap it?"
```

### 2. Suggest mode (Claude suggests topics)

```
User: "Suggest LinkedIn topics"

Claude:
- Optionally checks recent git commits for inspiration
- Presents 3-5 narrative angles (not lessons/frameworks)
- User picks one or asks for more
- Proceeds to draft mode
```

### 3. Post mode (after approval)

```
User: "Post it" or "Looks good"

Claude:
- Checks current time against optimal windows
- If off-peak: suggests waiting for better time
- Posts via MCP and confirms with link
```

### Review loop

User can request revisions ("make it shorter", "different hook", etc.) until approved.

## Algorithm Optimization

**Optimal posting times:**
- 8-10am (pre-meeting scroll)
- 12-2pm (lunch break)
- 5-7pm (end of day)
- Best days: Tuesday, Wednesday, Thursday

**Content signals:**
- Strong hook in first line (dwell time)
- No outbound links in main post
- Conversation-starting angles (not engagement bait)
- 3-5 relevant hashtags at bottom

## MCP Server: linkedin-mcp

### Tools

| Tool | Purpose |
|------|---------|
| `create_post` | Post text content to LinkedIn |
| `create_post_with_image` | Post with single image |
| `create_carousel` | Post with multiple images (carousel) |
| `get_post_analytics` | Fetch engagement stats (views, likes, comments) |
| `list_recent_posts` | Get recent posts with basic stats |
| `get_comments` | Fetch comments on a specific post |
| `reply_to_comment` | Reply to a comment |

### Auth

- OAuth 2.0 with LinkedIn API
- Tokens stored locally
- Refresh token handling built in
- Required scopes: `w_member_social`, `r_member_social`

## File Structure

```
personal-helper/
├── .claude/skills/
│   └── linkedin-post.md        # The skill file
│
└── mcp-servers/
    └── linkedin/
        ├── package.json
        ├── src/
        │   ├── index.ts        # MCP server entry
        │   ├── auth.ts         # OAuth 2.0 handling
        │   ├── api.ts          # LinkedIn API calls
        │   └── types.ts        # TypeScript types
        └── .env.example        # Template for credentials
```

## Implementation Order

1. Build MCP server with auth flow
2. Add posting tools (`create_post`, `create_post_with_image`, `create_carousel`)
3. Add analytics tools (`get_post_analytics`, `list_recent_posts`)
4. Add comment tools (`get_comments`, `reply_to_comment`)
5. Write the skill file with style guidelines and workflow

## LinkedIn Developer Setup

1. Create app at LinkedIn Developer Portal
2. Request `w_member_social` and `r_member_social` scopes
3. Set up OAuth redirect URI
4. Store credentials in `.env`
