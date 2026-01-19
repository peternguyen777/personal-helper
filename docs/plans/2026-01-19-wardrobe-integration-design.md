# Wardrobe Integration Design

Extend the `what-to-wear` skill to use a personal wardrobe catalog stored in Google Sheets, enabling outfit recommendations from items you actually own.

## Data Structure

**Google Sheet: "Wardrobe"**

| Column | Values | Notes |
|--------|--------|-------|
| Item | Free text | e.g., "Navy chore coat", "White OCBD" |
| Category | Top, Bottom, Outer, Shoes, Accessory | Used for outfit assembly |
| Pillar | Ivy, Workwear, Military, Sportswear | Ametora style classification |

Temperature and weather suitability are inferred by the AI from item names (e.g., "waxed jacket" → rain OK, "deck jacket" → under 18°C).

## Architecture

### MCP Dependency

Uses [ringo380/claude-google-sheets-mcp](https://github.com/ringo380/claude-google-sheets-mcp) for Google Sheets access.

**Required MCP tools:**
- `read_range` - fetch wardrobe items
- `append_data` - add new items
- `write_range` - update/remove items
- `list_spreadsheets` - discover sheet ID

### Skills

**1. `what-to-wear.md` (updated)**

Changes:
- Add step to read wardrobe from Google Sheet via MCP
- Update outfit logic to select from user's actual items
- AI infers weather-appropriateness from item names

Flow:
```
1. Fetch weather forecast
2. Read wardrobe sheet → get all items
3. Group items by category
4. For each outfit slot (Top, Bottom, Shoes, Outer):
   - AI selects item appropriate for current weather
   - Uses item name to infer temp/weather suitability
5. Format response with selected items
```

**2. `wardrobe.md` (new)**

Conversational wardrobe management:

| Command | Action |
|---------|--------|
| "Add [item] to my wardrobe" | Parse item, category, pillar → append to sheet |
| "What's in my wardrobe?" | Read sheet → list items grouped by category |
| "Remove [item]" | Find matching row → delete |
| "Show my [category]" | Filter and display |

## Outfit Selection Logic

The AI selects items by:
1. Filtering wardrobe by category for each outfit slot
2. Inferring weather suitability from item names:
   - "deck jacket", "field jacket" → cooler weather (under 18°C)
   - "camp collar", "tee" → warm weather (21°C+)
   - "waxed", "leather boots" → rain appropriate
3. Picking one item per slot that suits current conditions

No strict pillar mixing rules - AI decides freely.

## Setup Requirements

1. Install and authenticate `ringo380/claude-google-sheets-mcp`
2. Create Google Sheet named "Wardrobe" with columns: Item, Category, Pillar
3. Populate sheet with wardrobe items

## Implementation Tasks

1. [ ] Install and configure Google Sheets MCP
2. [ ] Create Wardrobe Google Sheet with initial items
3. [ ] Update `what-to-wear.md` skill to read from sheet
4. [ ] Create new `wardrobe.md` skill for item management
5. [ ] Test end-to-end flow
