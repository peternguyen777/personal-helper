---
name: what-to-wear
description: Use when asked "what should I wear today?" or similar outfit/clothing questions
---

# What to Wear Skill

Recommend daily outfits based on weather conditions, styled around ametora (Japanese Americana) aesthetics.

## Instructions

1. **Get weather data** using the `get_weather` MCP tool
   - Assume Sydney unless user explicitly mentions another city
   - Never ask for location - just use Sydney by default
   - The response includes `local_time` for that city

2. **Consider the local time** (from the weather response)
   - The `local_time` field shows current day and time for the city
   - Morning commute vs afternoon vs evening can affect layering needs
   - If it's evening, consider tomorrow morning's weather may differ

3. **Apply outfit logic** based on feels-like temperature:

| Feels Like | Base Layer |
|------------|------------|
| 21°C+ | Oxford shirt, tee, or camp collar shirt |
| 18-21°C | Add mid-layer: crew sweater, cardigan, or overshirt |
| Under 18°C | Add outer layer: chore coat, deck jacket, MA-1, or field jacket |

4. **Apply weather modifiers:**

| Condition | Adjustment |
|-----------|------------|
| Rain likely (>40%) | Water-resistant outer (waxed jacket, ventile), leather boots over canvas |
| High UV (11+) | Suggest hat and sunglasses |
| Humid (>70%) + warm (>25°C) | Favor linen, open-weave cotton, looser fits |
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

## Ametora Style Guide

Ametora ("American traditional") is how Japan reinterpreted American style. Draw from these four pillars:

| Pillar | Spirit | Examples |
|--------|--------|----------|
| **Ivy/Prep** | East coast collegiate, 1960s | OCBDs, crew sweaters, penny loafers, chinos, rep ties |
| **Workwear** | Durable, functional, worn-in | Chore coats, chambray, denim, work boots, coveralls |
| **Military** | Utilitarian, rugged | Field jackets, M-65s, fatigues, deck jackets, olive drab |
| **Sportswear** | Athletic heritage, casual | Coach's jackets, track tops, rugby shirts, sneakers |

**Key principles:**
- Natural materials (cotton, wool, leather, linen)
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
