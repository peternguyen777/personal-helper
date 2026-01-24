/**
 * Snapshot test for the outfit prompt.
 * Run with: npx tsx daily_outfit.prompt.test.ts
 * Update snapshots: npx tsx daily_outfit.prompt.test.ts --update
 */

import { buildPrompt, Weather, WardrobeItem, HistoryEntry } from "./prompt.ts";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SNAPSHOTS_DIR = join(__dirname, "__snapshots__");

// Mock wardrobe data
const mockWardrobe: WardrobeItem[] = [
  { Item: "Whitesville Tee", Category: "Top", Pillar: "Workwear", Quantity: 8, Description: "White heavyweight cotton tee" },
  { Item: "Buzz Rickson's Chambray", Category: "Top", Pillar: "Workwear", Quantity: 1, Description: "Light blue chambray work shirt" },
  { Item: "Kamakura OCBD", Category: "Top", Pillar: "Ivy", Quantity: 1, Description: "White oxford cloth button-down" },
  { Item: "OrSlow Fatigues", Category: "Bottom", Pillar: "Military", Quantity: 1, Description: "Olive green army fatigues" },
  { Item: "OrSlow 105 Jeans", Category: "Bottom", Pillar: "Workwear", Quantity: 1, Description: "Indigo selvedge denim" },
  { Item: "Alden Indy Boots", Category: "Shoes", Pillar: "Workwear", Quantity: 1, Description: "Brown leather work boots" },
  { Item: "Converse Chuck 70", Category: "Shoes", Pillar: "Sportswear", Quantity: 1, Description: "White canvas sneakers" },
  { Item: "Buzz Rickson's Deck Jacket", Category: "Outer", Pillar: "Military", Quantity: 1, Description: "Navy N-1 deck jacket" },
  { Item: "Ebbets Field Cap", Category: "Accessory", Pillar: "Sportswear", Quantity: 1, Description: "Wool baseball cap" },
  { Item: "Tochigi Leather Belt", Category: "Accessory", Pillar: "Workwear", Quantity: 1, Description: "Brown leather belt" },
];

// Test scenarios
const scenarios: { name: string; weather: Weather; history: HistoryEntry[] }[] = [
  {
    name: "hot-summer-day",
    weather: {
      temperature_c: 26,
      feels_like_c: 28,
      humidity_percent: 65,
      wind_speed_kmh: 15,
      rain_chance_percent: 5,
      conditions: "Sunny",
      high_c: 28,
      low_c: 20,
      daily_rain_chance_percent: 10,
      uv_index: 11,
      local_time: "7:30 AM",
      date_formatted: "Friday 24 Jan"
    },
    history: []
  },
  {
    name: "mild-layering-day",
    weather: {
      temperature_c: 18,
      feels_like_c: 17,
      humidity_percent: 55,
      wind_speed_kmh: 10,
      rain_chance_percent: 10,
      conditions: "Partly cloudy",
      high_c: 22,
      low_c: 16,
      daily_rain_chance_percent: 15,
      uv_index: 6,
      local_time: "7:30 AM",
      date_formatted: "Saturday 25 Jan"
    },
    history: []
  },
  {
    name: "cool-rainy-day",
    weather: {
      temperature_c: 15,
      feels_like_c: 13,
      humidity_percent: 85,
      wind_speed_kmh: 25,
      rain_chance_percent: 60,
      conditions: "Overcast",
      high_c: 17,
      low_c: 14,
      daily_rain_chance_percent: 70,
      uv_index: 3,
      local_time: "7:30 AM",
      date_formatted: "Sunday 26 Jan"
    },
    history: []
  },
  {
    name: "with-history",
    weather: {
      temperature_c: 20,
      feels_like_c: 19,
      humidity_percent: 60,
      wind_speed_kmh: 12,
      rain_chance_percent: 20,
      conditions: "Mostly sunny",
      high_c: 24,
      low_c: 18,
      daily_rain_chance_percent: 25,
      uv_index: 7,
      local_time: "7:30 AM",
      date_formatted: "Monday 27 Jan"
    },
    history: [
      { Date: "2025-01-26", Top: "Buzz Rickson's Chambray", Bottom: "OrSlow Fatigues", Shoes: "Alden Indy Boots", Outer: "", Accessory: "" },
      { Date: "2025-01-25", Top: "Whitesville Tee", Bottom: "OrSlow 105 Jeans", Shoes: "Converse Chuck 70", Outer: "", Accessory: "" },
    ]
  }
];

const updateMode = process.argv.includes("--update");

// Ensure snapshots directory exists
if (!existsSync(SNAPSHOTS_DIR)) {
  mkdirSync(SNAPSHOTS_DIR);
}

let passed = 0;
let failed = 0;
let updated = 0;

for (const scenario of scenarios) {
  const snapshotPath = join(SNAPSHOTS_DIR, `${scenario.name}.txt`);
  const prompt = buildPrompt(scenario.weather, mockWardrobe, scenario.history);

  if (updateMode) {
    writeFileSync(snapshotPath, prompt);
    console.log(`✓ Updated: ${scenario.name}`);
    updated++;
  } else if (!existsSync(snapshotPath)) {
    console.log(`✗ Missing: ${scenario.name}`);
    console.log(`  Run with --update to create snapshot`);
    failed++;
  } else {
    const expected = readFileSync(snapshotPath, "utf-8");
    if (prompt === expected) {
      console.log(`✓ Passed: ${scenario.name}`);
      passed++;
    } else {
      console.log(`✗ Failed: ${scenario.name}`);
      console.log("\n--- EXPECTED ---");
      console.log(expected);
      console.log("\n--- ACTUAL ---");
      console.log(prompt);
      console.log("\n");
      failed++;
    }
  }
}

console.log(`\n${passed} passed, ${failed} failed, ${updated} updated`);

if (failed > 0) {
  console.log("\nRun with --update to update snapshots");
  process.exit(1);
}
