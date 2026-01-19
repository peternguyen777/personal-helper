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
