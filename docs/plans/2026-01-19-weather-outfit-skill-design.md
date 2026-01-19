# Weather-Based Outfit Skill Design

## Overview

A personal productivity skill that recommends daily outfits based on weather conditions, styled around ametora (Japanese Americana) aesthetics.

## Components

### 1. MCP Server (`mcp-servers/weather/`)

**Tech stack:** Node.js/TypeScript

**Tool:** `get_weather(city: string)`

**Data sources:**
- **Australian cities**: Bureau of Meteorology (BOM)
  - Sydney endpoint: `http://www.bom.gov.au/fwo/IDN60901/IDN60901.94768.json`
- **International cities**: Open-Meteo API (free, no key required)

**Returns:**
```json
{
  "city": "Sydney",
  "temp_c": 22,
  "feels_like_c": 24,
  "humidity_percent": 65,
  "rain_chance_percent": 10,
  "uv_index": 8,
  "wind_kmh": 15,
  "conditions": "Partly cloudy"
}
```

### 2. Skill (`skills/what-to-wear.md`)

**Invocation:** "What should I wear today?"

**Default location:** Sydney, Australia

**Style:** Ametora (Japanese Americana) - combining workwear, military, ivy/prep, and sportswear elements.

## Outfit Logic

### Temperature Tiers (using feels-like temp)

| Feels Like | Recommendation |
|------------|----------------|
| 21°C+ | Oxford shirt, tee, camp collar shirt |
| 18-21°C | Add layer - crew sweater, cardigan, overshirt |
| Under 18°C | Outer layer - chore coat, deck jacket, MA-1, field jacket |

### Weather Modifiers

| Condition | Adjustment |
|-----------|------------|
| Rain | Water-resistant outer (waxed jacket, ventile), leather boots over canvas |
| High UV (11+) | Suggest hat/sunglasses |
| Humid (>70%) + warm (>25°C) | Favor linen, open-weave cotton, looser fits |
| Windy | Wind-blocking outers over knits |

### Output Format

Example response:
> **Today in Sydney**: 16°C (feels like 14°C), partly cloudy, light wind
>
> **Recommendation**: Chore coat weather. Oxford cloth button-down, chinos or selvedge denim, and a coverall jacket or Bedford. Leather boots work well.

## User Preferences

- Based in Sydney by default
- Travels occasionally - will mention when in another city
- Runs on standard temperature sensitivity
- Ametora wardrobe: chore coats, overshirts, oxford shirts, camp collar shirts, selvedge denim, chinos, deck jackets, MA-1s, field jackets

## Future Enhancements (not in v1)

- Activity-aware recommendations (gym, office, casual)
- Actual wardrobe inventory
- Morning routine integration
- Week-ahead planning
