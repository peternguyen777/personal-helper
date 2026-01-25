/**
 * Unit tests for daily_outfit.ts
 */

import { fetchWithRetry } from "./daily_outfit.ts";

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

// Save original fetch
const originalFetch = globalThis.fetch;

async function testRetrySucceedsOnFirstAttempt() {
  console.log("Test: Retry succeeds on first attempt...\n");

  let fetchCalls = 0;
  globalThis.fetch = async () => {
    fetchCalls++;
    return new Response(JSON.stringify({ data: "ok" }), { status: 200 });
  };

  const response = await fetchWithRetry("https://example.com", 3);
  assert(response.ok, "Response is ok");
  assert(fetchCalls === 1, "Fetch was called exactly once");

  globalThis.fetch = originalFetch;
}

async function testRetrySucceedsAfterFailures() {
  console.log("\nTest: Retry succeeds after initial failures...\n");

  let fetchCalls = 0;
  globalThis.fetch = async () => {
    fetchCalls++;
    if (fetchCalls < 3) {
      throw new Error("Network error");
    }
    return new Response(JSON.stringify({ data: "ok" }), { status: 200 });
  };

  const response = await fetchWithRetry("https://example.com", 3);
  assert(response.ok, "Response is ok after retries");
  assert(fetchCalls === 3, "Fetch was called 3 times before success");

  globalThis.fetch = originalFetch;
}

async function testRetryThrowsAfterMaxAttempts() {
  console.log("\nTest: Retry throws after max attempts...\n");

  let fetchCalls = 0;
  globalThis.fetch = async () => {
    fetchCalls++;
    throw new Error("Persistent network error");
  };

  let errorThrown = false;
  let errorMessage = "";
  try {
    await fetchWithRetry("https://example.com", 3);
  } catch (err: any) {
    errorThrown = true;
    errorMessage = err.message;
  }

  assert(errorThrown, "Error was thrown after max retries");
  assert(errorMessage.includes("failed after 3 attempts"), `Error message mentions attempts: ${errorMessage}`);
  assert(fetchCalls === 3, "Fetch was called exactly 3 times");

  globalThis.fetch = originalFetch;
}

async function testRetryHandlesHttpErrors() {
  console.log("\nTest: Retry handles HTTP errors...\n");

  let fetchCalls = 0;
  globalThis.fetch = async () => {
    fetchCalls++;
    if (fetchCalls < 2) {
      return new Response("Server Error", { status: 500, statusText: "Internal Server Error" });
    }
    return new Response(JSON.stringify({ data: "ok" }), { status: 200 });
  };

  const response = await fetchWithRetry("https://example.com", 3);
  assert(response.ok, "Response is ok after HTTP error retry");
  assert(fetchCalls === 2, "Fetch was called twice (first 500, then 200)");

  globalThis.fetch = originalFetch;
}

async function runTests() {
  await testRetrySucceedsOnFirstAttempt();
  await testRetrySucceedsAfterFailures();
  await testRetryThrowsAfterMaxAttempts();
  await testRetryHandlesHttpErrors();

  console.log(`\n${passed} passed, ${failed} failed`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test failed with error:", err);
  process.exit(1);
});
