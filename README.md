# Personal Helper

A collection of MCP servers and Claude Code skills for personal productivity.

## Structure

```
├── .claude/
│   └── skills/
│       ├── what-to-wear.md  # Daily/weekly outfit recommendations
│       └── wardrobe.md      # Wardrobe management (add/remove/list items)
├── mcp-servers/
│   ├── weather/             # Weather MCP server
│   └── google-sheets/       # Google Sheets MCP server
└── docs/
    └── plans/               # Design documents
```

## MCP Servers

### Weather

Provides weather data via two tools:
- `get_weather` - Current conditions (temp, feels-like, humidity, wind, UV, rain chance)
- `get_forecast` - Future day forecast (high/low temps, UV, rain chance, conditions)

Supports Australian cities (via BOM) and major international cities (via Open-Meteo).

### Google Sheets

Connects to Google Sheets for wardrobe data storage. Tools include:
- `read_range` - Read data from a sheet
- `write_range` - Write data to a sheet
- `append_data` - Append rows to a sheet
- `clear_range` - Clear data from a range

## Skills

### what-to-wear

Outfit recommendations based on weather, styled around ametora (Japanese Americana) aesthetics.

**Features:**
- Single day recommendations based on weather
- Weekly planning mode with variety logic
- Temperature-based layering
- Weather modifiers (rain, UV, humidity, wind)
- Pulls from your personal wardrobe in Google Sheets

**Usage:**
- "What should I wear today?"
- "What should I wear on Thursday?"
- "Plan my outfits for the week"

### wardrobe

Manage your wardrobe catalog stored in Google Sheets.

**Schema:**
| Column | Description |
|--------|-------------|
| Item | Item name (e.g., "Navy chore coat") |
| Category | Top, Bottom, Outer, Shoes, Accessory |
| Pillar | Ivy, Workwear, Military, Sportswear |
| Quantity | Number owned |
| Description | Optional notes |

**Usage:**
- "What's in my wardrobe?"
- "Show my tops"
- "Add a navy deck jacket to my wardrobe"
- "Remove the white tee from my wardrobe"
