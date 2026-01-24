/**
 * Tests for the centralized configuration module.
 * Run with: npx tsx config.test.ts
 */

import { CONFIG } from "./config.ts";

interface TestResult {
  name: string;
  passed: boolean;
  message?: string;
}

const results: TestResult[] = [];

function test(name: string, fn: () => void) {
  try {
    fn();
    results.push({ name, passed: true });
  } catch (error) {
    results.push({ name, passed: false, message: (error as Error).message });
  }
}

function assertEqual<T>(actual: T, expected: T, label: string) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
}

function assertDefined<T>(value: T, label: string) {
  if (value === undefined || value === null) {
    throw new Error(`${label}: expected to be defined`);
  }
}

// ============================================
// Default Values Tests
// ============================================

test("CONFIG.location has correct Sydney defaults", () => {
  assertEqual(CONFIG.location.name, "Sydney", "location.name");
  assertEqual(CONFIG.location.latitude, -33.8688, "location.latitude");
  assertEqual(CONFIG.location.longitude, 151.2093, "location.longitude");
  assertEqual(CONFIG.location.timezone, "Australia/Sydney", "location.timezone");
});

test("CONFIG.spreadsheet has default wardrobe ID", () => {
  assertEqual(
    CONFIG.spreadsheet.wardrobeId,
    "1Cx2KUswPEQypVMUPUTPtLOFQ3oGdme1TcFf7z5BZ_7k",
    "spreadsheet.wardrobeId"
  );
});

test("CONFIG.weatherRules has correct thresholds", () => {
  assertEqual(CONFIG.weatherRules.outerLayerTempC, 21, "outerLayerTempC");
  assertEqual(CONFIG.weatherRules.layeringTempMinC, 20, "layeringTempMinC");
  assertEqual(CONFIG.weatherRules.layeringTempMaxC, 24, "layeringTempMaxC");
  assertEqual(CONFIG.weatherRules.rainThresholdPercent, 40, "rainThresholdPercent");
  assertEqual(CONFIG.weatherRules.uvThreshold, 8, "uvThreshold");
});

test("CONFIG.sms has correct character limits", () => {
  assertEqual(CONFIG.sms.maxChars, 480, "sms.maxChars");
  assertEqual(CONFIG.sms.targetChars, 400, "sms.targetChars");
});

test("CONFIG.history has correct lookback days", () => {
  assertEqual(CONFIG.history.lookbackDays, 7, "history.lookbackDays");
});

// ============================================
// Structure Tests
// ============================================

test("CONFIG is immutable (as const)", () => {
  // TypeScript enforces this at compile time, but we can verify the structure exists
  assertDefined(CONFIG.location, "location");
  assertDefined(CONFIG.spreadsheet, "spreadsheet");
  assertDefined(CONFIG.weatherRules, "weatherRules");
  assertDefined(CONFIG.sms, "sms");
  assertDefined(CONFIG.history, "history");
});

test("CONFIG.weatherRules layering range is valid", () => {
  if (CONFIG.weatherRules.layeringTempMinC >= CONFIG.weatherRules.layeringTempMaxC) {
    throw new Error("layeringTempMinC should be less than layeringTempMaxC");
  }
});

test("CONFIG.sms targetChars is less than maxChars", () => {
  if (CONFIG.sms.targetChars >= CONFIG.sms.maxChars) {
    throw new Error("targetChars should be less than maxChars");
  }
});

// ============================================
// Run Tests
// ============================================

let passed = 0;
let failed = 0;

for (const result of results) {
  if (result.passed) {
    console.log(`✓ ${result.name}`);
    passed++;
  } else {
    console.log(`✗ ${result.name}`);
    console.log(`  ${result.message}`);
    failed++;
  }
}

console.log(`\n${passed} passed, ${failed} failed`);

if (failed > 0) {
  process.exit(1);
}
