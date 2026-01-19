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

When user provides an item to add:

1. **Research the item**
   - If user provides a URL → use WebFetch to get details
   - If user provides just a name → use WebSearch to find details
   - Look for: materials, construction, heritage, made in country

2. **Draft the entry** - Prepare:
   - Item name (include color in parentheses if relevant)
   - Category (Top, Bottom, Outer, Shoes, Accessory)
   - Pillar (Ivy, Workwear, Military, Sportswear) - leave blank for versatile basics like white tees
   - Quantity (default: 1, or as specified by user)
   - Description (brief - materials, key construction details, origin)

3. **Show for approval** - Present in table format:
   ```
   | Field | Value |
   |-------|-------|
   | Item | Barbour Bedale (Olive) |
   | Category | Outer |
   | Pillar | Workwear |
   | Quantity | 1 |
   | Description | Sylkoil waxed cotton, corduroy collar, made in England |
   ```
   User may request changes before approving.

4. **Add to sheet** - Once approved, use `append_data` to add new rows

**Batching:** User can provide multiple items at once. Research all, present all in one table, add all on approval.

**Updating existing items:** If user wants to update an item already in the sheet, use `write_range` to update that specific cell/row directly.

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
