# Personal Helper

A collection of MCP servers and Claude Code skills for personal productivity.

## Structure

```
├── .claude/
│   └── skills/
│       ├── what-to-wear.md      # Daily/weekly outfit recommendations
│       ├── wardrobe.md          # Wardrobe management
│       └── test-commit-push.md  # Development workflow
├── .github/
│   └── workflows/
│       ├── ci.yml               # Tests on PRs
│       └── daily-outfit.yml     # Daily SMS automation
├── scripts/
│   ├── daily_outfit.ts          # Outfit recommendation script
│   ├── daily_outfit.eval.ts     # Braintrust evals
│   └── *.test.ts                # Unit & integration tests
├── mcp-servers/
│   ├── weather/                 # Weather MCP server
│   └── google-sheets/           # Google Sheets MCP server
└── docs/
    └── plans/                   # Design documents
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
- History-aware: checks what you've worn recently to avoid repetition

**History Tracking:**
- Tops: Won't recommend if worn >= quantity in last 7 days (e.g., Whitesville Tee qty 8 can be worn 8x/week)
- Bottoms: Can repeat but varies for interest

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

## Automation

### Daily Outfit SMS

Automated script that sends a daily outfit recommendation via SMS at 6:30am Sydney time.

**How it works:**
1. Fetches weather from Open-Meteo API
2. Reads wardrobe from Google Sheets
3. Checks outfit history (last 7 days) to avoid repeating tops
4. Gets recommendation from Claude
5. Sends SMS via Twilio
6. Saves outfit to History sheet

**Runs via:** GitHub Actions (scheduled) or locally with `.env` file

**Google Sheets Structure:**
- `Wardrobe Catalogue`: Wardrobe catalog (Item, Category, Pillar, Quantity, Description)
- `History`: Outfit history (Date, Top, Bottom, Shoes, Outer, Accessory)

## Development

### Workflow

All changes go through PRs with required CI checks. See `.claude/skills/test-commit-push.md` for details.

```bash
git checkout -b feature/my-change
# make changes
npm test                 # unit tests
npm run test:integration # integration test (calls real APIs)
git add -A && git commit -m "feat: description"
git push -u origin feature/my-change
gh pr create
```

### CI Checks

| Job | Command | Secrets |
|-----|---------|---------|
| `test` | `npm test` | None |
| `integration` | `npm run test:integration` | ANTHROPIC_API_KEY, BRAINTRUST_API_KEY, GOOGLE_SERVICE_ACCOUNT |

### Evals

Prompt quality is tracked via [Braintrust](https://braintrust.dev). Run evals locally:

```bash
npm run eval
```

Scorers check: required fields, char limit, correct date, weather rules (outer/boots/cap).
