# Wardrobe Integration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enable the what-to-wear skill to recommend outfits from your actual wardrobe stored in Google Sheets.

**Architecture:** Google Sheet stores wardrobe items (Item, Category, Pillar). The what-to-wear skill reads this via MCP and selects items based on weather. A new wardrobe skill handles adding/removing items.

**Tech Stack:** Google Sheets MCP (ringo380/claude-google-sheets-mcp), Claude skills (markdown)

---

### Task 1: Install Google Sheets MCP

**Step 1: Clone and install the MCP**

```bash
cd ~/
git clone https://github.com/ringo380/claude-google-sheets-mcp.git
cd claude-google-sheets-mcp
./install-claude-cli.sh
```

Follow the interactive prompts to authenticate with Google.

**Step 2: Verify MCP is configured**

Check Claude's MCP config:
```bash
cat ~/.claude/mcp_servers.json
```

Expected: Should contain an entry for the Google Sheets MCP.

**Step 3: Test MCP connection**

In a new Claude session, run:
```
List my Google Sheets
```

Expected: MCP returns list of spreadsheets from your Google Drive.

---

### Task 2: Create Wardrobe Google Sheet

**Step 1: Create the sheet**

Create a new Google Sheet named "Wardrobe" with these columns in row 1:
- A1: `Item`
- B1: `Category`
- C1: `Pillar`

**Step 2: Add initial wardrobe items**

Populate with your actual wardrobe. Example starter items:

| Item | Category | Pillar |
|------|----------|--------|
| White OCBD | Top | Ivy |
| Navy OCBD | Top | Ivy |
| Chambray shirt | Top | Workwear |
| Camp collar shirt (ecru) | Top | Ivy |
| Navy pocket tee | Top | Sportswear |
| White pocket tee | Top | Sportswear |
| Tan chinos | Bottom | Ivy |
| Olive fatigues | Bottom | Military |
| Navy chinos | Bottom | Ivy |
| Indigo denim | Bottom | Workwear |
| Penny loafers | Shoes | Ivy |
| White canvas sneakers | Shoes | Sportswear |
| Leather work boots | Shoes | Workwear |
| Navy chore coat | Outer | Workwear |
| Olive field jacket | Outer | Military |
| Navy deck jacket | Outer | Military |

**Step 3: Verify sheet is accessible via MCP**

In Claude, run:
```
Read range A1:C20 from my Wardrobe spreadsheet
```

Expected: Returns your wardrobe items.

---

### Task 3: Create wardrobe Skill

**Files:**
- Create: `.claude/skills/wardrobe.md`

**Step 1: Write the skill file**

```markdown
---
name: wardrobe
description: Use when user wants to add, remove, or list items in their wardrobe catalog
---

# Wardrobe Management Skill

Manage your wardrobe catalog stored in Google Sheets.

## Prerequisites

Requires `google-sheets-mcp` configured with access to a sheet named "Wardrobe".

## Sheet Structure

| Column | Values |
|--------|--------|
| Item | Item name (e.g., "Navy chore coat") |
| Category | Top, Bottom, Outer, Shoes, Accessory |
| Pillar | Ivy, Workwear, Military, Sportswear |

## Commands

### Adding Items

When user says "add [item] to my wardrobe":

1. Parse the item description
2. Infer category from context (jacket → Outer, shirt → Top, etc.)
3. Infer pillar from style cues, or ask if unclear
4. Use MCP `append_data` to add row to Wardrobe sheet
5. Confirm: "Added [item] ([category], [pillar]) to your wardrobe."

**Example:**
> User: "Add a navy deck jacket to my wardrobe"
> → Item: "Navy deck jacket", Category: Outer, Pillar: Military
> → Append to sheet, confirm addition

### Listing Items

When user says "what's in my wardrobe?" or "show my wardrobe":

1. Use MCP `read_range` to get all items (A:C)
2. Group by category
3. Display formatted list

**Format:**
```
**Your Wardrobe**

**Tops (6)**
- White OCBD (Ivy)
- Navy OCBD (Ivy)
- Chambray shirt (Workwear)
...

**Bottoms (4)**
- Tan chinos (Ivy)
...
```

### Filtering by Category

When user says "show my tops" or "what jackets do I have?":

1. Read wardrobe from sheet
2. Filter by requested category
3. Display filtered list

### Removing Items

When user says "remove [item] from my wardrobe":

1. Read wardrobe to find matching item
2. If exact match found, delete the row
3. If multiple matches, ask user to clarify
4. Confirm: "Removed [item] from your wardrobe."

**Note:** Use MCP `write_range` with empty values or batch update to remove rows.
```

**Step 2: Verify skill is recognized**

Start new Claude session and ask:
```
Add white canvas sneakers to my wardrobe
```

Expected: Claude uses the wardrobe skill, appends item to sheet.

**Step 3: Commit**

```bash
git add .claude/skills/wardrobe.md
git commit -m "feat: add wardrobe management skill"
```

---

### Task 4: Update what-to-wear Skill

**Files:**
- Modify: `.claude/skills/what-to-wear.md`

**Step 1: Add wardrobe reading step**

After the frontmatter and before "## Instructions", add:

```markdown
## Prerequisites

Requires:
- `weather` MCP for weather data
- `google-sheets-mcp` for wardrobe access
- Google Sheet named "Wardrobe" with columns: Item, Category, Pillar
```

**Step 2: Update Instructions section**

Replace step 1 with expanded version that includes wardrobe reading:

```markdown
## Instructions

1. **Get weather data** using MCP tools
   - For today/current weather: use `get_weather` (use `feels_like` for outfit decisions)
   - For a specific future day: use `get_forecast` with the day parameter (e.g., "wednesday", "tomorrow")
   - **For forecasts**: Use the **high temperature** (`temp_high_c`) for outfit decisions - this reflects daytime conditions. Ignore the overnight low (`temp_low_c`).
   - Assume Sydney unless user explicitly mentions another city
   - Never ask for location - just use Sydney by default

2. **Read wardrobe** from Google Sheets
   - Use MCP `read_range` to fetch all items from "Wardrobe" sheet (columns A:C)
   - Parse into list of items with their Category and Pillar
   - If sheet is empty or unavailable, fall back to generic ametora suggestions

3. **Consider the local time** (from the weather response)
   - The `local_time` field shows current day and time for the city
   - Morning commute vs afternoon vs evening can affect layering needs
   - If it's evening, consider tomorrow morning's weather may differ
```

**Step 3: Update outfit logic section**

Replace step 3 (Apply outfit logic) with:

```markdown
4. **Select outfit from wardrobe** based on weather:

   For each category needed (Top, Bottom, Shoes, and optionally Outer):
   - Filter your wardrobe items by that category
   - Select an item appropriate for the current conditions
   - Infer weather suitability from item names:
     - Warm weather (21°C+): tees, camp collar shirts, lightweight items
     - Mild weather (18-21°C): OCBDs, chambray, light layers
     - Cool weather (under 18°C): heavier items, add outer layer
     - Rain likely: prioritize "waxed", "leather", water-resistant items

   **Outer layer logic:**
   - Skip Outer category if temp is 21°C+ and no rain expected
   - Include Outer if temp is under 21°C or rain chance > 40%

   **If category has no items:** Note the gap and suggest a generic ametora piece
```

**Step 4: Update weather modifiers section**

Replace step 4 with:

```markdown
5. **Apply weather modifiers** when selecting items:

| Condition | Item Selection Preference |
|-----------|--------------------------|
| Rain likely (>40%) | Prefer items with "waxed", "leather", "ventile" in name; boots over canvas |
| High UV (11+) | Suggest adding hat and sunglasses |
| Humid (>70%) + warm (>25°C) | Prefer lightweight items, tees, open-weave fabrics |
| Windy (>30 km/h) | Prefer structured outers over knit layers |
```

**Step 5: Update response format section**

Replace step 5 with:

```markdown
6. **Format response** with your selected items:

> **Today in [City]**: [temp]°C (feels like [feels_like]°C), [conditions], [wind] km/h wind
> **Time**: [current local time] - [context about when clothes will be worn]
>
> **Outfit:**
> - **Top**: [selected item from your wardrobe]
> - **Bottom**: [selected item from your wardrobe]
> - **Shoes**: [selected item from your wardrobe]
> - **Outer layer** (if needed): [selected item from your wardrobe]
>
> **Styling notes**: [tips on how to wear the selected pieces together, color coordination, fit advice]
```

**Step 6: Update Weekly Planning Mode**

In the "Apply variety logic" section, replace the rotation pool table with:

```markdown
### 2. Apply variety logic

Using your wardrobe items, rotate through to avoid repetition:

**Variety rules:**
- Don't repeat the same item on consecutive days
- Balance colors across the week (don't wear navy top 3 days in a row)
- If weather is similar across days, vary by pillar to keep it interesting
- Match outer layers to temperature needs, but vary style when possible
- If you don't have enough variety in a category, it's OK to repeat after 2-3 days
```

**Step 7: Update Weekly Capsule Summary**

At the end of weekly format section, update to:

```markdown
> **Weekly Capsule Summary**: [List which of YOUR items you'll use this week, noting if any category is limited, e.g., "This week you'll wear: 3 of your 4 tops, both chinos, and your loafers and sneakers. Consider adding another outer layer option for rainy days."]
```

**Step 8: Verify updated skill works**

Start new Claude session and ask:
```
What should I wear tomorrow?
```

Expected: Claude reads your wardrobe from Google Sheets and recommends items you actually own.

**Step 9: Commit**

```bash
git add .claude/skills/what-to-wear.md
git commit -m "feat: integrate wardrobe sheet into what-to-wear skill"
```

---

### Task 5: End-to-End Testing

**Step 1: Test daily outfit recommendation**

```
What should I wear today?
```

Verify: Response includes items from your wardrobe sheet.

**Step 2: Test weekly planning**

```
What should I wear this week?
```

Verify: Uses your actual items, doesn't repeat same item on consecutive days.

**Step 3: Test wardrobe management**

```
Add a grey crewneck sweater to my wardrobe
```

Verify: Item added to Google Sheet.

```
What's in my wardrobe?
```

Verify: New item appears in list.

**Step 4: Test weather-appropriate selection**

Check a rainy day forecast and verify it prefers water-resistant items from your wardrobe.

---

## Summary

After completing all tasks:
- Google Sheets MCP installed and authenticated
- "Wardrobe" sheet created with your items
- `wardrobe` skill for managing items
- `what-to-wear` skill reads from your wardrobe
- Outfit recommendations use items you actually own
