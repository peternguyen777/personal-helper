/**
 * Push test scenarios to Braintrust dataset.
 * Run with: npm run push:dataset
 */

import { initDataset } from "braintrust";
import type { Weather, WardrobeItem, HistoryEntry } from "./types.ts";

// Mock wardrobe (same as eval tests)
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

// Format wardrobe for prompt template
function formatWardrobe(wardrobe: WardrobeItem[]): string {
  return wardrobe
    .map(item => `- ${item.Item} (${item.Category}, ${item.Pillar || "N/A"}): ${item.Description || "N/A"}`)
    .join("\n");
}

// Format history section for prompt template
function formatHistory(history: HistoryEntry[], wardrobe: WardrobeItem[]): string {
  if (history.length === 0) return "";

  // Count how many times each top was worn
  const topWearCounts: Record<string, number> = {};
  for (const h of history) {
    if (h.Top) {
      topWearCounts[h.Top] = (topWearCounts[h.Top] || 0) + 1;
    }
  }

  // Build quantity lookup from wardrobe
  const topQuantities: Record<string, number> = {};
  for (const item of wardrobe) {
    if (item.Category === "Top") {
      topQuantities[item.Item] = item.Quantity;
    }
  }

  // Only exclude tops that have been worn >= their quantity
  const excludedTops = Object.entries(topWearCounts)
    .filter(([top, count]) => count >= (topQuantities[top] || 1))
    .map(([top]) => top);

  const bottomsWorn = [...new Set(history.filter(h => h.Bottom).map(h => h.Bottom))];

  return `
<recent_outfits>
RULES:
- DO NOT recommend these tops (already worn their max times this week): ${excludedTops.length > 0 ? excludedTops.join(", ") : "None - all tops available"}
- Try to vary bottoms (recently worn): ${bottomsWorn.length > 0 ? bottomsWorn.join(", ") : "None"}

Full history (last 7 days):
${history.map(h => `- ${h.Date}: Top=${h.Top || "N/A"}, Bottom=${h.Bottom || "N/A"}`).join("\n")}
</recent_outfits>`;
}

interface TestCase {
  input: {
    name: string;
    weather: Weather;
    history: HistoryEntry[];
    excludedTops: string[];
    // Pre-computed fields for prompt template
    wardrobe_formatted: string;
    history_section: string;
  };
  expected: {
    shouldHaveOuter: boolean;
    shouldPreferBoots: boolean;
    shouldSuggestCap: boolean;
  };
}

// Pre-compute the wardrobe_formatted (same for all test cases)
const wardrobeFormatted = formatWardrobe(mockWardrobe);

const testCases: TestCase[] = [
  {
    input: {
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
        date_formatted: "Friday 24 Jan",
      },
      history: [],
      excludedTops: [],
      wardrobe_formatted: wardrobeFormatted,
      history_section: "", // No history
    },
    expected: {
      shouldHaveOuter: false,
      shouldPreferBoots: false,
      shouldSuggestCap: true,
    },
  },
  {
    input: {
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
        date_formatted: "Saturday 25 Jan",
      },
      history: [],
      excludedTops: [],
      wardrobe_formatted: wardrobeFormatted,
      history_section: "", // No history
    },
    expected: {
      shouldHaveOuter: false, // high is 22, >= 21
      shouldPreferBoots: false,
      shouldSuggestCap: false,
    },
  },
  {
    input: {
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
        date_formatted: "Sunday 26 Jan",
      },
      history: [],
      excludedTops: [],
      wardrobe_formatted: wardrobeFormatted,
      history_section: "", // No history
    },
    expected: {
      shouldHaveOuter: true,
      shouldPreferBoots: true,
      shouldSuggestCap: false,
    },
  },
  {
    input: {
      name: "with-excluded-top",
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
        date_formatted: "Monday 27 Jan",
      },
      history: [
        {
          Date: "2025-01-26",
          Top: "Buzz Rickson's Chambray",
          Bottom: "OrSlow Fatigues",
          Shoes: "Alden Indy Boots",
          Outer: "",
          Accessory: "",
        },
      ],
      excludedTops: ["Buzz Rickson's Chambray"],
      wardrobe_formatted: wardrobeFormatted,
      history_section: formatHistory([
        {
          Date: "2025-01-26",
          Top: "Buzz Rickson's Chambray",
          Bottom: "OrSlow Fatigues",
          Shoes: "Alden Indy Boots",
          Outer: "",
          Accessory: "",
        },
      ], mockWardrobe),
    },
    expected: {
      shouldHaveOuter: false,
      shouldPreferBoots: false,
      shouldSuggestCap: false,
    },
  },
];

async function main() {
  console.log("Initializing dataset...");
  const dataset = initDataset("daily-outfit-prompt", {
    dataset: "test-scenarios",
  });

  // Delete existing records to avoid duplicates
  console.log("Clearing existing records...");
  const existingRecords = await dataset.fetchedData();
  for (const record of existingRecords) {
    dataset.delete(record.id);
    console.log(`  - deleted ${record.id}`);
  }

  console.log("Pushing test cases...");
  for (const tc of testCases) {
    // Use stable ID based on test name for upsert behavior
    dataset.insert({
      id: tc.input.name,
      input: tc.input,
      expected: tc.expected,
      metadata: { name: tc.input.name },
    });
    console.log(`  + ${tc.input.name}`);
  }

  // Flush to ensure all changes are written
  await dataset.flush();
  console.log(`\nDone! Pushed ${testCases.length} test cases to Braintrust.`);
}

main().catch(console.error);
