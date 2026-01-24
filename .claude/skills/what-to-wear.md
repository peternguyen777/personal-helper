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
  - **Sheet1**: Wardrobe catalog (Item, Category, Pillar, Quantity, Description)
  - **History**: Outfit history (Date, Top, Bottom, Shoes, Outer, Accessory)

## Instructions

1. **Get weather data** using MCP tools
   - **Always fetch both** `get_weather` (for current conditions, humidity, wind, local time) AND `get_forecast` for today (for the high temp)
   - **Which temperature to use for outfit decisions:**
     - Morning (before 12pm): Use the forecast high (`temp_high_c`) — dress for the warmest part of the day ahead
     - Afternoon/Evening (12pm onwards): Use current conditions (`feels_like_c`) — the day's peak has passed
   - Use `get_weather` data for wind and current conditions regardless of time
   - For a specific future day: use `get_forecast` with the day parameter (e.g., "wednesday", "tomorrow") — includes humidity
   - Assume Sydney unless user explicitly mentions another city
   - Never ask for location - just use Sydney by default

2. **Read wardrobe** from Google Sheets
   - Use MCP `read_range` to fetch all items from "Sheet1" sheet (columns A:E)
   - Columns: Item, Category, Pillar (optional), Quantity, Description (optional)
   - Parse into list of items with their properties
   - Use Description field (if present) for additional context about the item
   - If sheet is empty or unavailable, fall back to generic ametora suggestions

3. **Check outfit history** from the History sheet
   - Use MCP `read_range` to fetch from "History" sheet (columns A:F)
   - Filter to last 7 days only
   - Track which tops have been worn and how many times
   - **Top repetition rule**: Don't recommend a top if it's been worn >= its Quantity in the last 7 days
     - Example: Whitesville Tee (qty 8) can be worn up to 8 times per week
     - Example: Kamakura OCBD (qty 1) can only be worn once per week
   - **Bottom repetition rule**: Bottoms can repeat within a week, but vary when possible
   - If History sheet doesn't exist, skip this step (first run)

4. **Consider the local time** (from the weather response)
   - The `local_time` field shows current day and time for the city
   - Morning commute vs afternoon vs evening can affect layering needs
   - If it's evening, consider tomorrow morning's weather may differ

5. **Select outfit from wardrobe** based on weather:

   For each category needed (Top, Bottom, Shoes, optionally Outer, and optionally Accessory):
   - Filter your wardrobe items by that category
   - Select an item appropriate for the current conditions
   - Infer weather suitability from item names:
     - Warm (24°C+): tee alone, or lightweight shirt alone
     - Mild (20-24°C): tee + overshirt (worn open), or shirt alone
     - Cool (15-20°C): shirt alone, or tee + outer
     - Cold (under 15°C): tee + overshirt + outer
     - Rain likely: prioritize "waxed", "leather", water-resistant items

   **Tee + overshirt layering:**
   - Can recommend a white tee with an open button-up shirt (chambray, madras, OCBD) as a layered look
   - Works especially well in mild weather when a single layer isn't quite enough
   - Format as: "Whitesville tee + Buzz Rickson's chambray (unbuttoned)"

   **Outer layer logic:**
   - Skip Outer category if temp is 21°C+
   - Include Outer only if temp is under 21°C

   **Accessory logic:**
   - Suggest a cap/hat when UV is high (8+) or for added style
   - Suggest a belt that complements the outfit's pillar (e.g., leather belt with workwear, woven belt with ivy)
   - Accessories are optional - only include when they genuinely enhance the outfit

   **Rain chance - which value to use:**
   - Morning/midday: Use forecast `rain_chance_percent` — the day is ahead
   - Evening (after 5pm): Use current conditions `rain_chance_percent` — daily forecast window has mostly passed

   **If category has no items:** Note the gap and suggest a generic ametora piece

6. **Apply weather modifiers** when selecting items:

| Condition | Item Selection Preference |
|-----------|--------------------------|
| Rain likely (>40%) | Prefer items with "waxed", "leather", "ventile" in name; boots over canvas |
| High UV (11+) | Suggest adding hat and sunglasses |
| Humid (>80%) + mild/warm (>20°C) | Prefer lightweight items, tees, open-weave fabrics; skip outer layers |
| Windy (>30 km/h) | Prefer structured outers over knit layers |

7. **Format response** with your selected items:

> **Today in [City]**: [temp]°C (feels like [feels_like]°C), [conditions], [wind] km/h wind
> **Time**: [current local time] - [context about when clothes will be worn]
>
> **Outfit:**
> - **Top**: [selected item from your wardrobe]
> - **Bottom**: [selected item from your wardrobe]
> - **Shoes**: [selected item from your wardrobe]
> - **Outer layer** (if needed): [selected item from your wardrobe]
> - **Accessory** (if appropriate): [selected item from your wardrobe - cap, belt, etc.]
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
> - **Accessory**: Navy baseball cap (sun protection)
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
> - **Accessory**: Tochigi leather belt
>
> **Styling notes**: Military bottoms with a workwear top and ivy-influenced outerwear - classic ametora mixing. Keep the chambray untucked for a relaxed silhouette. The deck jacket handles the wind while staying casual.
