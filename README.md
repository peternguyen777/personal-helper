# Personal Helper

A collection of MCP servers and Claude Code skills for personal productivity.

## Structure

```
├── mcp-servers/
│   └── weather/       # Weather MCP server (Australian + international cities)
├── skills/
│   └── what-to-wear.md  # Daily/weekly outfit recommendations (ametora style)
└── docs/
    └── plans/         # Design documents
```

## MCP Servers

### Weather

Provides weather data via two tools:
- `get_weather` - Current conditions (temp, feels-like, humidity, wind, UV, rain chance)
- `get_forecast` - Future day forecast (high/low temps, UV, rain chance, conditions)

Supports Australian cities (via BOM) and major international cities (via Open-Meteo).

## Skills

### what-to-wear

Outfit recommendations based on weather, styled around ametora (Japanese Americana) aesthetics.

**Features:**
- Single day recommendations
- Weekly planning mode with variety logic
- Temperature-based layering
- Weather modifiers (rain, UV, humidity, wind)

**Usage:**
- "What should I wear today?"
- "What should I wear on Thursday?"
- "Plan my outfits for the week"
