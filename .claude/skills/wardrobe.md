---
name: wardrobe
description: Use when user wants to add, remove, or list items in their wardrobe catalog
---

# Wardrobe Management Skill

Manage your wardrobe catalog stored in Google Sheets.

## Prerequisites

Requires `google-sheets-mcp` configured with access to the Wardrobe sheet.

**Spreadsheet ID**: `1Cx2KUswPEQypVMUPUTPtLOFQ3oGdme1TcFf7z5BZ_7k`

## Sheet Structure

| Column | Values | Required |
|--------|--------|----------|
| Item | Item name (e.g., "Navy chore coat") | Yes |
| Category | Top, Bottom, Outer, Shoes, Accessory | Yes |
| Pillar | Ivy, Workwear, Military, Sportswear | No |
| Quantity | Number of this item owned (default: 1) | Yes |
| Description | Optional notes about the item | No |

## Commands

### Adding Items

When user says "add [item] to my wardrobe":

1. Parse the item description
2. Infer category from context (jacket → Outer, shirt → Top, etc.)
3. Infer pillar from style cues, or leave empty if unclear
4. Set quantity to 1 (or specified amount)
5. Include description if provided by user
6. Use MCP `append_data` to add row with columns A:E
7. Confirm: "Added [item] ([category]) to your wardrobe."

**Example:**
> User: "Add a navy deck jacket to my wardrobe"
> → Item: "Navy deck jacket", Category: Outer, Pillar: Military, Quantity: 1
> → Append to sheet, confirm addition

> User: "Add 2 white tees from Uniqlo"
> → Item: "White tee", Category: Top, Pillar: Sportswear, Quantity: 2
> → Append to sheet, confirm addition

### Listing Items

When user says "what's in my wardrobe?" or "show my wardrobe":

1. Use MCP `read_range` to get all items (A:E)
2. Group by category
3. Display formatted list (show quantity if > 1, pillar if set)

**Format:**
```
**Your Wardrobe**

**Tops (6)**
- White OCBD (Ivy)
- White tee x2 (Sportswear)
- Chambray shirt (Workwear)
...

**Bottoms (4)**
- Tan chinos (Ivy)
...
```

### Filtering by Category

When user says "show my tops" or "what jackets do I have?":

1. Read wardrobe from sheet (A:E)
2. Filter by requested category
3. Display filtered list with quantity and description if available

### Removing Items

When user says "remove [item] from my wardrobe":

1. Read wardrobe to find matching item
2. If exact match found, delete the row
3. If multiple matches, ask user to clarify
4. Confirm: "Removed [item] from your wardrobe."

**Note:** Use MCP `write_range` with empty values or batch update to remove rows.
