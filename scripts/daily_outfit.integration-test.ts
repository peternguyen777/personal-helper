/**
 * Integration test for daily outfit script.
 * Calls real Anthropic API and Google Sheets, but mocks SMS and history save.
 * Run with: npm run test:integration
 */

import { runDailyOutfit, fetchWardrobe, type Dependencies } from "./daily_outfit.ts";
import type { Weather } from "./types.ts";

// Track mock calls
const smsCalls: string[] = [];
const historySaves: Record<string, string>[] = [];

// Mock weather data (deterministic for testing)
const mockWeather: Weather = {
  temperature_c: 22,
  feels_like_c: 21,
  humidity_percent: 55,
  wind_speed_kmh: 12,
  rain_chance_percent: 10,
  conditions: "Partly cloudy",
  high_c: 25,
  low_c: 18,
  daily_rain_chance_percent: 15,
  uv_index: 6,
  local_time: "7:30 AM",
  date_formatted: "Friday 24 Jan",
};

// Dependencies: real wardrobe from Google Sheets, mocked SMS/history
const testDependencies: Dependencies = {
  fetchWeather: async () => mockWeather,
  fetchWardrobe,  // Real Google Sheets call
  fetchOutfitHistory: async () => [],  // Empty history for deterministic test
  sendSms: async (message: string) => {
    smsCalls.push(message);
  },
  saveOutfitToHistory: async (outfit) => {
    historySaves.push(outfit as Record<string, string>);
  },
};

// Simple test runner
let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`✓ ${message}`);
    passed++;
  } else {
    console.log(`✗ ${message}`);
    failed++;
  }
}

async function runTests() {
  console.log("Running integration test (real wardrobe, mocked SMS)...\n");

  // Clear tracking arrays
  smsCalls.length = 0;
  historySaves.length = 0;

  // Run the script with test dependencies
  const { recommendation, smsWasSent } = await runDailyOutfit(testDependencies);

  // Verify SMS was "sent"
  assert(smsWasSent === true, "smsWasSent flag is true");
  assert(smsCalls.length === 1, "sendSms was called exactly once");

  // Verify recommendation format
  const smsContent = smsCalls[0] || "";
  assert(smsContent.length > 0, "SMS has content");
  assert(smsContent.length <= 480, `SMS under 480 chars (got ${smsContent.length})`);
  assert(smsContent.includes("Top:"), "SMS contains Top field");
  assert(smsContent.includes("Bottom:"), "SMS contains Bottom field");
  assert(smsContent.includes("Shoes:"), "SMS contains Shoes field");

  // Verify history was saved
  assert(historySaves.length === 1, "saveOutfitToHistory was called exactly once");

  // Summary
  console.log(`\n${passed} passed, ${failed} failed`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Integration test failed with error:", err);
  process.exit(1);
});
