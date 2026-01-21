---
name: linkedin-post
description: Use when asked to draft, suggest, or post LinkedIn content
---

# LinkedIn Post Skill

Draft, review, and post content to LinkedIn with algorithm optimization.

## Prerequisites

- `linkedin` MCP server authenticated (run `cd mcp-servers/linkedin && source .env && npm run auth` if needed)

## Style Guidelines

- Casual personal storytelling (not thought-leader cringe)
- Short and punchy (2-4 paragraphs)
- Strong opening hook that creates curiosity
- No emojis, no em dashes
- No hashtags
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

[Optional: genuine CTA if relevant]
```

## What NOT to Do

- No "I learned that..." openings
- No numbered lists of advice
- No "Here's my framework for..."
- No forced engagement bait ("Comment if you agree!") - but genuine CTAs are OK when relevant (e.g., "interested? let me know")
- No humble brags disguised as stories
- No em dashes
- No emojis
- No hashtags

## Example Post

```
Spent 20 minutes in a meeting trying to sound smart about a feature I'd never heard of.

Turns out it was something I built last quarter. Just with a different name now.

Product management is mostly just keeping track of what things are called this week.
```
