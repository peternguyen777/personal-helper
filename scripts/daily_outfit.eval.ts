/**
 * Braintrust evals for the outfit recommendation prompt.
 * Run with: npx dotenv -e ../.env -- braintrust eval daily_outfit.eval.ts
 */

import { Eval } from "braintrust";
import Anthropic from "@anthropic-ai/sdk";
import { buildPrompt, Weather, WardrobeItem, HistoryEntry } from "./prompt.ts";

// Mock wardrobe (same as snapshot tests)
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

// Test case type
interface TestCase {
  input: {
    name: string;
    weather: Weather;
    history: HistoryEntry[];
    excludedTops: string[];
  };
  expected: {
    shouldHaveOuter: boolean;
    shouldPreferBoots: boolean;
    shouldSuggestCap: boolean;
  };
}

// Test scenarios
const testCases: TestCase[] = [
  {
    input: {
      name: "hot-summer-day",
      weather: {
        temperature_c: 26, feels_like_c: 28, humidity_percent: 65, wind_speed_kmh: 15,
        rain_chance_percent: 5, conditions: "Sunny", high_c: 28, low_c: 20,
        daily_rain_chance_percent: 10, uv_index: 11, local_time: "7:30 AM", date_formatted: "Friday 24 Jan"
      },
      history: [],
      excludedTops: [],
    },
    expected: {
      shouldHaveOuter: false,  // temp >= 21
      shouldPreferBoots: false, // rain < 40%
      shouldSuggestCap: true,   // UV >= 8
    }
  },
  {
    input: {
      name: "cool-rainy-day",
      weather: {
        temperature_c: 15, feels_like_c: 13, humidity_percent: 85, wind_speed_kmh: 25,
        rain_chance_percent: 60, conditions: "Overcast", high_c: 17, low_c: 14,
        daily_rain_chance_percent: 70, uv_index: 3, local_time: "7:30 AM", date_formatted: "Sunday 26 Jan"
      },
      history: [],
      excludedTops: [],
    },
    expected: {
      shouldHaveOuter: true,   // temp < 21
      shouldPreferBoots: true,  // rain > 40%
      shouldSuggestCap: false,  // UV < 8
    }
  },
  {
    input: {
      name: "with-excluded-top",
      weather: {
        temperature_c: 20, feels_like_c: 19, humidity_percent: 60, wind_speed_kmh: 12,
        rain_chance_percent: 20, conditions: "Mostly sunny", high_c: 24, low_c: 18,
        daily_rain_chance_percent: 25, uv_index: 7, local_time: "7:30 AM", date_formatted: "Monday 27 Jan"
      },
      history: [
        { Date: "2025-01-26", Top: "Buzz Rickson's Chambray", Bottom: "OrSlow Fatigues", Shoes: "Alden Indy Boots", Outer: "", Accessory: "" },
      ],
      excludedTops: ["Buzz Rickson's Chambray"],
    },
    expected: {
      shouldHaveOuter: false,  // temp >= 21 (high is 24)
      shouldPreferBoots: false, // rain < 40%
      shouldSuggestCap: false,  // UV < 8
    }
  },
];

// Helper to parse outfit from response
function parseOutfit(response: string): Record<string, string> {
  const outfit: Record<string, string> = {};
  const patterns = ["Top", "Bottom", "Shoes", "Outer", "Accessory"];

  for (const field of patterns) {
    const match = response.match(new RegExp(`${field}:\\s*(.+?)(?:\\n|$)`, "i"));
    if (match) {
      outfit[field.toLowerCase()] = match[1].trim();
    }
  }
  return outfit;
}

// Custom scorers
const hasRequiredFields = (args: { output: string }) => {
  const outfit = parseOutfit(args.output);
  const hasTop = !!outfit.top;
  const hasBottom = !!outfit.bottom;
  const hasShoes = !!outfit.shoes;
  return {
    name: "has_required_fields",
    score: hasTop && hasBottom && hasShoes ? 1 : 0,
    metadata: { hasTop, hasBottom, hasShoes },
  };
};

const underCharLimit = (args: { output: string }) => {
  const length = args.output.length;
  return {
    name: "under_char_limit",
    score: length <= 480 ? 1 : 0,
    metadata: { length, limit: 480 },
  };
};

const usesWardrobeItems = (args: { output: string }) => {
  const outfit = parseOutfit(args.output);
  const wardrobeItems = mockWardrobe.map(w => w.Item.toLowerCase());

  const fields = ["top", "bottom", "shoes", "outer", "accessory"];
  let validCount = 0;
  let totalCount = 0;
  const issues: string[] = [];

  for (const field of fields) {
    if (outfit[field]) {
      totalCount++;
      // Handle layered tops like "Whitesville Tee + Buzz Rickson's Chambray (unbuttoned)"
      const items = outfit[field].split("+").map(s => s.replace(/\(.*\)/, "").trim().toLowerCase());
      const allValid = items.every(item =>
        wardrobeItems.some(w => item.includes(w) || w.includes(item))
      );
      if (allValid) {
        validCount++;
      } else {
        issues.push(`${field}: "${outfit[field]}" not in wardrobe`);
      }
    }
  }

  return {
    name: "uses_wardrobe_items",
    score: totalCount > 0 ? validCount / totalCount : 0,
    metadata: { validCount, totalCount, issues },
  };
};

const respectsExcludedTops = (args: { output: string; expected: TestCase["expected"]; input: TestCase["input"] }) => {
  const outfit = parseOutfit(args.output);
  const excludedTops = args.input.excludedTops.map(t => t.toLowerCase());

  if (excludedTops.length === 0) {
    return { name: "respects_excluded_tops", score: 1, metadata: { skipped: true } };
  }

  const topValue = (outfit.top || "").toLowerCase();
  const usedExcluded = excludedTops.some(excluded => topValue.includes(excluded.toLowerCase()));

  return {
    name: "respects_excluded_tops",
    score: usedExcluded ? 0 : 1,
    metadata: { excludedTops, actualTop: outfit.top, usedExcluded },
  };
};

const respectsOuterRule = (args: { output: string; expected: TestCase["expected"]; input: TestCase["input"] }) => {
  const outfit = parseOutfit(args.output);
  const hasOuter = !!outfit.outer;
  const shouldHaveOuter = args.expected.shouldHaveOuter;

  // If should have outer but doesn't, that's a fail
  // If shouldn't have outer but does, that's also a fail
  const correct = hasOuter === shouldHaveOuter;

  return {
    name: "respects_outer_rule",
    score: correct ? 1 : 0,
    metadata: { hasOuter, shouldHaveOuter, temp: args.input.weather.high_c },
  };
};

const respectsBootsRule = (args: { output: string; expected: TestCase["expected"]; input: TestCase["input"] }) => {
  const outfit = parseOutfit(args.output);
  const shoes = (outfit.shoes || "").toLowerCase();
  const hasBoots = shoes.includes("boot");
  const shouldPreferBoots = args.expected.shouldPreferBoots;

  // Only penalize if should prefer boots but didn't use them
  if (!shouldPreferBoots) {
    return { name: "respects_boots_rule", score: 1, metadata: { skipped: true, rain: args.input.weather.daily_rain_chance_percent } };
  }

  return {
    name: "respects_boots_rule",
    score: hasBoots ? 1 : 0,
    metadata: { shoes: outfit.shoes, hasBoots, rain: args.input.weather.daily_rain_chance_percent },
  };
};

const respectsCapRule = (args: { output: string; expected: TestCase["expected"]; input: TestCase["input"] }) => {
  const outfit = parseOutfit(args.output);
  const accessory = (outfit.accessory || "").toLowerCase();
  const hasCap = accessory.includes("cap") || accessory.includes("hat");
  const shouldSuggestCap = args.expected.shouldSuggestCap;

  // Only penalize if should suggest cap but didn't
  if (!shouldSuggestCap) {
    return { name: "respects_cap_rule", score: 1, metadata: { skipped: true, uv: args.input.weather.uv_index } };
  }

  return {
    name: "respects_cap_rule",
    score: hasCap ? 1 : 0,
    metadata: { accessory: outfit.accessory, hasCap, uv: args.input.weather.uv_index },
  };
};

const usesCorrectDate = (args: { output: string; input: TestCase["input"] }) => {
  const expectedDate = args.input.weather.date_formatted;
  const hasDate = args.output.includes(expectedDate);

  return {
    name: "uses_correct_date",
    score: hasDate ? 1 : 0,
    metadata: { expectedDate, found: hasDate },
  };
};

// Main eval
const client = new Anthropic();

Eval("daily-outfit-prompt", {
  data: () => testCases.map(tc => ({
    input: tc.input,
    expected: tc.expected,
  })),

  task: async (input) => {
    const prompt = buildPrompt(input.weather, mockWardrobe, input.history);

    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 200,
      temperature: 1.0,
      messages: [{ role: "user", content: prompt }],
    });

    return (message.content[0] as { text: string }).text;
  },

  scores: [
    hasRequiredFields,
    underCharLimit,
    usesWardrobeItems,
    respectsExcludedTops,
    respectsOuterRule,
    respectsBootsRule,
    respectsCapRule,
    usesCorrectDate,
  ],
});
