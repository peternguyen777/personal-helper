---
name: what-to-wear
description: Use when asked "what should I wear today?", weekly outfit planning, or similar clothing questions
model: sonnet
---

# What to Wear Skill

Recommend daily or weekly outfits based on weather conditions, styled around ametora (Japanese Americana) aesthetics.

## Instructions

1. **Get weather data** using MCP tools
   - For today/current weather: use `get_weather` (use `feels_like` for outfit decisions)
   - For a specific future day: use `get_forecast` with the day parameter (e.g., "wednesday", "tomorrow")
   - **For forecasts**: Use the **high temperature** (`temp_high_c`) for outfit decisions - this reflects daytime conditions. Ignore the overnight low (`temp_low_c`).
   - Assume Sydney unless user explicitly mentions another city
   - Never ask for location - just use Sydney by default

2. **Consider the local time** (from the weather response)
   - The `local_time` field shows current day and time for the city
   - Morning commute vs afternoon vs evening can affect layering needs
   - If it's evening, consider tomorrow morning's weather may differ

3. **Apply outfit logic** based on feels-like temperature:

| Feels Like | Base Layer |
|------------|------------|
| 21°C+ | Oxford shirt, tee, camp collar shirt, or tee + overshirt |
| 18-21°C | Add mid-layer: crew sweater, cardigan, or overshirt |
| Under 18°C | Add outer layer: chore coat, deck jacket, MA-1, or field jacket |

4. **Apply weather modifiers:**

| Condition | Adjustment |
|-----------|------------|
| Rain likely (>40%) | Water-resistant outer (waxed jacket, ventile), leather boots over canvas |
| High UV (11+) | Suggest hat and sunglasses |
| Humid (>70%) + warm (>25°C) | Favor open-weave cotton, looser fits |
| Windy (>30 km/h) | Wind-blocking outers over knits |

5. **Format response** with specific categories:

> **Today in [City]**: [temp]°C (feels like [feels_like]°C), [conditions], [wind] km/h wind
> **Time**: [current local time] - [context about when clothes will be worn]
>
> **Outfit:**
> - **Top**: [specific ametora top recommendation]
> - **Bottom**: [specific ametora bottom recommendation]
> - **Shoes**: [specific ametora footwear recommendation]
> - **Outer layer** (optional): [if needed based on temperature/conditions]
>
> **Styling notes**: [optional tips on fit, tucking, rolling sleeves/cuffs, color coordination, or how to wear the pieces together in ametora style]

---

## Weekly Planning Mode

When the user asks for a week's worth of outfits, "what to wear this week", or similar multi-day requests:

### 1. Fetch forecasts for each day

Use `get_forecast` for each day of the week (monday, tuesday, wednesday, thursday, friday, saturday, sunday). Call them in parallel to save time.

### 2. Apply variety logic

Rotate through options to avoid repetition:

| Category | Rotation Pool |
|----------|---------------|
| **Tops** | OCBD → chambray → camp collar → tee → rugby shirt → pocket tee |
| **Bottoms** | Chinos → fatigues → denim → lightweight trousers |
| **Shoes** | Loafers → canvas sneakers → leather sneakers → work boots |
| **Pillars** | Cycle through Ivy → Workwear → Military → Sportswear across the week |

**Variety rules:**
- Don't repeat the same top on consecutive days
- Balance colors across the week (don't do navy top 3 days in a row)
- If weather is similar across days, vary by pillar to keep it interesting
- Match outer layers to temperature needs, but vary style when possible

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
> **Weekly Capsule Summary**: [List the key pieces needed for the week, e.g., "You'll need: 2 button-ups, 2 tees, 2 chinos, 1 denim, loafers, sneakers, and a light jacket for Wednesday's rain"]

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
