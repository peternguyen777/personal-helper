---
name: what-to-wear
description: Use when asked "what should I wear today?" or similar outfit/clothing questions
---

# What to Wear Skill

Recommend daily outfits based on weather conditions, styled around ametora (Japanese Americana) aesthetics.

## Instructions

1. **Get weather data** using the `get_weather` MCP tool
   - Default city: Sydney
   - If user mentions being in another city, use that city

2. **Apply outfit logic** based on feels-like temperature:

| Feels Like | Base Layer |
|------------|------------|
| 21°C+ | Oxford shirt, tee, or camp collar shirt |
| 18-21°C | Add mid-layer: crew sweater, cardigan, or overshirt |
| Under 18°C | Add outer layer: chore coat, deck jacket, MA-1, or field jacket |

3. **Apply weather modifiers:**

| Condition | Adjustment |
|-----------|------------|
| Rain likely (>40%) | Water-resistant outer (waxed jacket, ventile), leather boots over canvas |
| High UV (11+) | Suggest hat and sunglasses |
| Humid (>70%) + warm (>25°C) | Favor linen, open-weave cotton, looser fits |
| Windy (>30 km/h) | Wind-blocking outers over knits |

4. **Format response** like this:

> **Today in [City]**: [temp]°C (feels like [feels_like]°C), [conditions], [wind] km/h wind
>
> **Recommendation**: [Temperature tier descriptor]. [Specific pieces]. [Footwear note if relevant].

## Example Responses

**Warm day (feels like 24°C):**
> **Today in Sydney**: 26°C (feels like 24°C), partly cloudy, light wind
>
> **Recommendation**: T-shirt weather. Camp collar shirt or a broken-in oxford, chinos or fatigues, canvas sneakers or loafers.

**Cool day (feels like 15°C):**
> **Today in Sydney**: 16°C (feels like 15°C), overcast, moderate wind
>
> **Recommendation**: Jacket weather. Oxford cloth button-down, selvedge denim, and a chore coat or Bedford jacket. Leather boots work well today.

**Rainy day:**
> **Today in Sydney**: 18°C (feels like 16°C), rain expected (70% chance)
>
> **Recommendation**: Layer for rain. Button-down under a waxed jacket or ventile coat. Skip the canvas shoes—go with leather boots. Bring an umbrella.

## Wardrobe Reference (Ametora Style)

- **Tops**: Oxford cloth button-downs, camp collar shirts, henleys, pocket tees
- **Mid-layers**: Crew sweaters, cardigans, overshirts, chamois shirts
- **Outers**: Chore coats, Bedford jackets, deck jackets, MA-1 bombers, field jackets, waxed jackets
- **Bottoms**: Selvedge denim, chinos, fatigues, baker pants
- **Footwear**: Leather boots, canvas sneakers, loafers, moc-toe boots
