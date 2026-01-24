/**
 * Push test scenarios to Braintrust dataset.
 * Run with: npm run push:dataset
 */

import { initDataset } from "braintrust";
import type { Weather, HistoryEntry } from "./prompt.ts";

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

  console.log("Pushing test cases...");
  for (const tc of testCases) {
    const id = dataset.insert({
      input: tc.input,
      expected: tc.expected,
      metadata: { name: tc.input.name },
    });
    console.log(`  ✓ ${tc.input.name} (${id})`);
  }

  // Flush to ensure all records are written
  await dataset.flush();
  console.log(`\nDone! Pushed ${testCases.length} test cases to Braintrust.`);
}

main().catch(console.error);
