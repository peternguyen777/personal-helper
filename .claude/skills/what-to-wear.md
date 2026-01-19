---
name: what-to-wear
description: Use when asked "what should I wear today?", weekly outfit planning, or similar clothing questions
---

# What to Wear Skill

Recommend daily or weekly outfits based on weather conditions, styled around ametora (Japanese Americana) aesthetics.

## Prerequisites

Requires:
- `weather` MCP for weather data
- `google-sheets-mcp` for wardrobe access
- Wardrobe spreadsheet ID: `1Cx2KUswPEQypVMUPUTPtLOFQ3oGdme1TcFf7z5BZ_7k`

## Instructions

1. **Get weather data** using MCP tools
   - For today/current weather: use `get_weather` (use `feels_like` for outfit decisions)
   - For a specific future day: use `get_forecast` with the day parameter (e.g., "wednesday", "tomorrow")
   - **For forecasts**: Use the **high temperature** (`temp_high_c`) for outfit decisions - this reflects daytime conditions. Ignore the overnight low (`temp_low_c`).
   - Assume Sydney unless user explicitly mentions another city
   - Never ask for location - just use Sydney by default

2. **Read wardrobe** from Google Sheets
   - Use MCP `read_range` to fetch all items from "Sheet1" sheet (columns A:F)
   - Columns: Item, Category, Pillar (optional), Quantity, Description (optional), Link (optional)
   - Parse into list of items with their properties
   - Use Description field (if present) for additional context about the item
   - If sheet is empty or unavailable, fall back to generic ametora suggestions

3. **Consider the local time** (from the weather response)
   - The `local_time` field shows current day and time for the city
   - Morning commute vs afternoon vs evening can affect layering needs
   - If it's evening, consider tomorrow morning's weather may differ

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

5. **Apply weather modifiers** when selecting items:

| Condition | Item Selection Preference |
|-----------|--------------------------|
| Rain likely (>40%) | Prefer items with "waxed", "leather", "ventile" in name; boots over canvas |
| High UV (11+) | Suggest adding hat and sunglasses |
| Humid (>70%) + warm (>25°C) | Prefer lightweight items, tees, open-weave fabrics |
| Windy (>30 km/h) | Prefer structured outers over knit layers |

6. **Use item links** (if available) to learn more about items:
   - If an item has a Link and you need more details (e.g., material, care instructions, styling suggestions), use WebFetch to retrieve information from the link
   - This is optional - only fetch when additional context would improve the recommendation

7. **Format response** with your selected items:

> **Today in [City]**: [temp]°C (feels like [feels_like]°C), [conditions], [wind] km/h wind
> **Time**: [current local time] - [context about when clothes will be worn]
>
> **Outfit:**
> - **Top**: [selected item from your wardrobe]
> - **Bottom**: [selected item from your wardrobe]
> - **Shoes**: [selected item from your wardrobe]
> - **Outer layer** (if needed): [selected item from your wardrobe]
>
> **Styling notes**: [tips on how to wear the selected pieces together, color coordination, fit advice. Use item descriptions if available for additional context.]

---

## Weekly Planning Mode

When the user asks for a week's worth of outfits, "what to wear this week", or similar multi-day requests:

### 1. Fetch forecasts for each day

Use `get_forecast` for each day of the week (monday, tuesday, wednesday, thursday, friday, saturday, sunday). Call them in parallel to save time.

### 2. Apply variety logic

Using your wardrobe items, rotate through to avoid repetition:

**Variety rules:**
- Don't repeat the same item on consecutive days
- Balance colors across the week (don't wear navy top 3 days in a row)
- If weather is similar across days, vary by pillar to keep it interesting
- Match outer layers to temperature needs, but vary style when possible
- If you don't have enough variety in a category, it's OK to repeat after 2-3 days

### 3. Format weekly response

> **Week Overview for [City]**
>
> | Day | Weather | Outfit Summary |
> |-----|---------|----------------|
> | Mon | 24°C, sunny | Chambray + chinos + loafers |
> | Tue | 22°C, overcast | OCBD + fatigues + canvas sneakers |
> | ... | ... | ... |
>
> ---
>
> **Monday** - 24°C, sunny
> - **Top**: Chambray shirt
> - **Bottom**: Tan chinos
> - **Shoes**: Penny loafers
> - **Notes**: [brief styling note]
>
> **Tuesday** - 22°C, overcast
> - **Top**: White OCBD
> - **Bottom**: Olive fatigues
> - **Shoes**: White canvas sneakers
> - **Notes**: [brief styling note]
>
> [continue for each day...]
>
> **Weekly Capsule Summary**: [List which of YOUR items you'll use this week, noting if any category is limited, e.g., "This week you'll wear: 3 of your 4 tops, both chinos, and your loafers and sneakers. Consider adding another outer layer option for rainy days."]

---

## Ametora Style Guide

Ametora ("American traditional") is how Japan reinterpreted American style. Draw from these four pillars:

| Pillar | Spirit | Examples |
|--------|--------|----------|
| **Ivy/Prep** | East coast collegiate, 1960s | OCBDs, crew sweaters, penny loafers, chinos, rep ties |
| **Workwear** | Durable, functional, worn-in | Chore coats, chambray, denim, work boots, coveralls |
| **Military** | Utilitarian, rugged | Field jackets, M-65s, fatigues, deck jackets, olive drab |
| **Sportswear** | Athletic heritage, casual | Coach's jackets, track tops, rugby shirts, sneakers |

**Key principles:**
- Natural materials (cotton, wool, leather)
- Relaxed but intentional fit
- Muted, earthy tones - navy, olive, tan, cream, brown
- Pieces that age well and develop character
- Mix pillars freely (ivy shirt + military jacket is classic ametora)

## Example Response

> **Today in Sydney**: 18°C (feels like 16°C), overcast, moderate wind
> **Time**: 8:00am - heading out for the day
>
> **Outfit:**
> - **Top**: Chambray shirt
> - **Bottom**: Olive fatigues
> - **Shoes**: Leather work boots
> - **Outer layer**: Navy deck jacket
>
> **Styling notes**: Military bottoms with a workwear top and ivy-influenced outerwear - classic ametora mixing. Keep the chambray untucked for a relaxed silhouette. The deck jacket handles the wind while staying casual.
