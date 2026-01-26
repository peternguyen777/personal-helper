/**
 * Daily outfit recommendation script.
 * Fetches weather, reads wardrobe from Google Sheets, gets Claude's recommendation,
 * and sends it via SMS.
 */

import Anthropic from "@anthropic-ai/sdk";
import { initLogger, wrapAnthropic, traced, loadPrompt } from "braintrust";
import { config } from "dotenv";
import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";
import Twilio from "twilio";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { type Weather, type WardrobeItem, type HistoryEntry } from "./types.ts";
import {
  hasRequiredFields,
  underCharLimit,
  usesCorrectDate,
  respectsOuterRule,
  respectsBootsRule,
  respectsCapRule,
} from "./scorers.ts";
import { CONFIG } from "./config.ts";

// Re-export types for backwards compatibility
export { type Weather, type WardrobeItem, type HistoryEntry } from "./types.ts";

// Pinned prompt version - update this when deploying new prompt versions
const PROMPT_VERSION = "4ab69a410103bcfe";

// Load .env file if it exists (for local development)
const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, "..", ".env") });

// Initialize Braintrust logger for production monitoring
const logger = initLogger({
  projectName: "daily-outfit-prompt",
  apiKey: process.env.BRAINTRUST_API_KEY,
});


interface Outfit {
  top?: string;
  bottom?: string;
  shoes?: string;
  outer?: string;
  accessory?: string;
}

// Weather codes mapping
const WEATHER_CODES: Record<number, string> = {
  0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
  45: "Foggy", 48: "Depositing rime fog",
  51: "Light drizzle", 53: "Moderate drizzle", 55: "Dense drizzle",
  61: "Slight rain", 63: "Moderate rain", 65: "Heavy rain",
  71: "Slight snow", 73: "Moderate snow", 75: "Heavy snow",
  80: "Slight rain showers", 81: "Moderate rain showers", 82: "Violent rain showers",
  95: "Thunderstorm", 96: "Thunderstorm with slight hail", 99: "Thunderstorm with heavy hail"
};

function getSydneyTime(): Date {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "Australia/Sydney" }));
}

function formatDate(date: Date): string {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${days[date.getDay()]} ${date.getDate()} ${months[date.getMonth()]}`;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

export async function fetchWithRetry(url: string, maxRetries: number = 3): Promise<Response> {
  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      if (response.ok) return response;
      lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
    } catch (err) {
      lastError = err as Error;
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000; // Exponential backoff: 2s, 4s, 8s
        console.log(`Weather fetch attempt ${attempt} failed, retrying in ${delay/1000}s...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  throw new Error(`Weather API failed after ${maxRetries} attempts: ${lastError?.message}`);
}

async function fetchWeather(): Promise<Weather> {
  const params = new URLSearchParams({
    latitude: CONFIG.location.latitude.toString(),
    longitude: CONFIG.location.longitude.toString(),
    current: "temperature_2m,relative_humidity_2m,apparent_temperature,precipitation_probability,weather_code,wind_speed_10m",
    daily: "temperature_2m_max,temperature_2m_min,precipitation_probability_max,uv_index_max",
    timezone: "Australia/Sydney",
    forecast_days: "1"
  });

  const response = await fetchWithRetry(`https://api.open-meteo.com/v1/forecast?${params}`);
  if (!response.ok) throw new Error(`Weather API error: ${response.statusText}`);

  const data = await response.json();
  const current = data.current;
  const daily = data.daily;
  const sydneyNow = getSydneyTime();

  return {
    temperature_c: current.temperature_2m,
    feels_like_c: current.apparent_temperature,
    humidity_percent: current.relative_humidity_2m,
    wind_speed_kmh: current.wind_speed_10m,
    rain_chance_percent: current.precipitation_probability,
    conditions: WEATHER_CODES[current.weather_code] || "Unknown",
    high_c: daily.temperature_2m_max[0],
    low_c: daily.temperature_2m_min[0],
    daily_rain_chance_percent: daily.precipitation_probability_max[0],
    uv_index: daily.uv_index_max[0],
    local_time: formatTime(sydneyNow),
    date_formatted: formatDate(sydneyNow)
  };
}

async function getGoogleSheet(): Promise<GoogleSpreadsheet> {
  const serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT!);
  const jwt = new JWT({
    email: serviceAccount.client_email,
    key: serviceAccount.private_key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"]
  });

  const doc = new GoogleSpreadsheet(CONFIG.spreadsheet.wardrobeId, jwt);
  await doc.loadInfo();
  return doc;
}

export async function fetchWardrobe(): Promise<WardrobeItem[]> {
  const doc = await getGoogleSheet();
  const sheet = doc.sheetsByTitle["Wardrobe Catalogue"];
  const rows = await sheet.getRows();

  return rows.map(row => ({
    Item: row.get("Item"),
    Category: row.get("Category"),
    Pillar: row.get("Pillar") || undefined,
    Quantity: parseInt(row.get("Quantity")) || 1,
    Description: row.get("Description") || undefined
  }));
}

async function fetchOutfitHistory(days: number = CONFIG.history.lookbackDays): Promise<HistoryEntry[]> {
  const doc = await getGoogleSheet();
  let sheet = doc.sheetsByTitle["History"];

  if (!sheet) {
    sheet = await doc.addSheet({
      title: "History",
      headerValues: ["Date", "Top", "Bottom", "Shoes", "Outer", "Accessory"]
    });
    return [];
  }

  const rows = await sheet.getRows();
  if (rows.length === 0) return [];

  const sydneyNow = getSydneyTime();
  const cutoffDate = new Date(sydneyNow);
  cutoffDate.setDate(cutoffDate.getDate() - days);

  const history: HistoryEntry[] = [];
  for (const row of rows) {
    try {
      const dateStr = row.get("Date");
      const recordDate = new Date(dateStr);
      if (recordDate >= cutoffDate) {
        history.push({
          Date: dateStr,
          Top: row.get("Top") || "",
          Bottom: row.get("Bottom") || "",
          Shoes: row.get("Shoes") || "",
          Outer: row.get("Outer") || "",
          Accessory: row.get("Accessory") || ""
        });
      }
    } catch {
      continue;
    }
  }

  return history;
}

async function saveOutfitToHistory(outfit: Outfit): Promise<void> {
  const doc = await getGoogleSheet();
  let sheet = doc.sheetsByTitle["History"];

  if (!sheet) {
    sheet = await doc.addSheet({
      title: "History",
      headerValues: ["Date", "Top", "Bottom", "Shoes", "Outer", "Accessory"]
    });
  }

  const sydneyNow = getSydneyTime();
  const today = `${sydneyNow.getFullYear()}-${String(sydneyNow.getMonth() + 1).padStart(2, "0")}-${String(sydneyNow.getDate()).padStart(2, "0")}`;

  await sheet.addRow({
    Date: today,
    Top: outfit.top || "",
    Bottom: outfit.bottom || "",
    Shoes: outfit.shoes || "",
    Outer: outfit.outer || "",
    Accessory: outfit.accessory || ""
  });
}

// Format wardrobe for prompt template
function formatWardrobe(wardrobe: WardrobeItem[]): string {
  return wardrobe
    .map(item => `- ${item.Item} (${item.Category}, ${item.Pillar || "N/A"}): ${item.Description || "N/A"}`)
    .join("\n");
}

// Format history section for prompt template
function formatHistorySection(history: HistoryEntry[], wardrobe: WardrobeItem[]): { historySection: string; excludedTops: string[] } {
  if (history.length === 0) {
    return { historySection: "", excludedTops: [] };
  }

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

  const historySection = `
<recent_outfits>
RULES:
- DO NOT recommend these tops (already worn their max times this week): ${excludedTops.length > 0 ? excludedTops.join(", ") : "None - all tops available"}
- Try to vary bottoms (recently worn): ${bottomsWorn.length > 0 ? bottomsWorn.join(", ") : "None"}

Full history (last 7 days):
${history.map(h => `- ${h.Date}: Top=${h.Top || "N/A"}, Bottom=${h.Bottom || "N/A"}`).join("\n")}
</recent_outfits>`;

  return { historySection, excludedTops };
}

// Cache for the loaded prompt
let outfitPromptCache: Awaited<ReturnType<typeof loadPrompt>> | null = null;

async function getOutfitPrompt() {
  if (!outfitPromptCache) {
    outfitPromptCache = await loadPrompt({
      projectName: "daily-outfit-prompt",
      slug: "daily-outfit",
      version: PROMPT_VERSION,
    });
  }
  return outfitPromptCache;
}

async function getOutfitRecommendation(
  weather: Weather,
  wardrobe: WardrobeItem[],
  history: HistoryEntry[]
): Promise<string> {
  // Wrap Anthropic client for Braintrust logging
  const client = wrapAnthropic(new Anthropic());

  // Load hosted prompt from Braintrust (pinned version)
  const outfitPrompt = await getOutfitPrompt();

  // Format input for the prompt template
  const { historySection, excludedTops } = formatHistorySection(history, wardrobe);
  const input = {
    weather,
    wardrobe_formatted: formatWardrobe(wardrobe),
    history_section: historySection,
    excludedTops,
  };

  // Render the prompt with input data
  const rendered = outfitPrompt.build({ input });
  const messages = rendered.messages as Array<{ role: "user" | "assistant"; content: string }>;

  const message = await client.messages.create({
    model: rendered.model || "claude-sonnet-4-20250514",
    max_tokens: 400,
    temperature: 1.0,
    messages,
  });

  const response = (message.content[0] as { text: string }).text;

  return response;
}

function parseOutfitFromRecommendation(recommendation: string): Outfit {
  const outfit: Outfit = {};

  const patterns: Record<keyof Outfit, RegExp> = {
    top: /Top:\s*(.+?)(?:\n|$)/i,
    bottom: /Bottom:\s*(.+?)(?:\n|$)/i,
    shoes: /Shoes:\s*(.+?)(?:\n|$)/i,
    outer: /Outer:\s*(.+?)(?:\n|$)/i,
    accessory: /Accessory:\s*(.+?)(?:\n|$)/i
  };

  for (const [key, pattern] of Object.entries(patterns)) {
    const match = recommendation.match(pattern);
    if (match) {
      outfit[key as keyof Outfit] = match[1].trim();
    }
  }

  return outfit;
}

function scoreRecommendation(
  output: string,
  weather: Weather
): { scores: Record<string, number>; passed: boolean } {
  // Build expected values based on weather rules
  const expected = {
    shouldHaveOuter: weather.high_c < CONFIG.weatherRules.outerLayerTempC,
    shouldPreferBoots: weather.daily_rain_chance_percent > CONFIG.weatherRules.rainThresholdPercent,
    shouldSuggestCap: weather.uv_index >= CONFIG.weatherRules.uvThreshold,
  };

  const input = { weather };

  // Run all scorers
  const results = [
    hasRequiredFields({ output }),
    underCharLimit({ output }),
    usesCorrectDate({ output, input }),
    respectsOuterRule({ output, expected, input }),
    respectsBootsRule({ output, expected, input }),
    respectsCapRule({ output, expected, input }),
  ];

  // Collect scores
  const scores: Record<string, number> = {};
  for (const result of results) {
    scores[result.name] = result.score;
  }

  // Check if all passed
  const passed = results.every(r => r.score === 1);

  return { scores, passed };
}

async function sendSms(message: string): Promise<void> {
  const client = Twilio(
    process.env.TWILIO_ACCOUNT_SID!,
    process.env.TWILIO_AUTH_TOKEN!
  );

  try {
    const result = await client.messages.create({
      body: message,
      from: process.env.TWILIO_FROM_NUMBER!,
      to: process.env.MY_PHONE_NUMBER!
    });
    console.log(`SMS sent successfully! SID: ${result.sid}, Status: ${result.status}`);
  } catch (error) {
    console.log(`SMS failed: ${error}`);
    throw error;
  }
}

// Dependencies that can be injected for testing
export interface Dependencies {
  fetchWeather: () => Promise<Weather>;
  fetchWardrobe: () => Promise<WardrobeItem[]>;
  fetchOutfitHistory: (days?: number) => Promise<HistoryEntry[]>;
  sendSms: (message: string) => Promise<void>;
  saveOutfitToHistory: (outfit: Outfit) => Promise<void>;
}

// Default production dependencies
const defaultDependencies: Dependencies = {
  fetchWeather,
  fetchWardrobe,
  fetchOutfitHistory,
  sendSms,
  saveOutfitToHistory,
};

// Exported for testing - runs the full flow with injectable dependencies
export async function runDailyOutfit(deps: Dependencies = defaultDependencies): Promise<{ recommendation: string; smsWasSent: boolean }> {
  // Debug: Show timezone calculation
  const sydneyNow = getSydneyTime();
  const utcNow = new Date();
  console.log(`UTC time: ${utcNow.toISOString()}`);
  console.log(`Sydney time: ${sydneyNow.toISOString()}`);
  console.log(`Date formatted: ${formatDate(sydneyNow)}`);

  console.log("Fetching weather...");
  const weather = await deps.fetchWeather();
  console.log(`Weather API response: ${JSON.stringify(weather, null, 2)}`);

  console.log("Fetching wardrobe...");
  const wardrobe = await deps.fetchWardrobe();
  console.log(`Wardrobe API response (${wardrobe.length} items): ${JSON.stringify(wardrobe, null, 2)}`);

  console.log("Fetching outfit history...");
  const history = await deps.fetchOutfitHistory();
  console.log(`Outfit history (last ${CONFIG.history.lookbackDays} days): ${JSON.stringify(history, null, 2)}`);

  // Use traced to create a span for recommendation and scoring
  const { recommendation, scores, passed } = await traced(async (span) => {
    console.log("Getting recommendation from Claude...");
    const recommendation = await getOutfitRecommendation(weather, wardrobe, history);
    console.log(`Recommendation (${recommendation.length} chars): ${recommendation}`);

    console.log("Scoring recommendation...");
    const { scores, passed } = scoreRecommendation(recommendation, weather);
    console.log(`Scores: ${JSON.stringify(scores, null, 2)}`);
    console.log(`All scores passed: ${passed}`);

    // Log scores to the span
    span.log({
      input: { weather, historyCount: history.length },
      output: recommendation,
      scores,
      metadata: {
        passed,
        charCount: recommendation.length,
        date: weather.date_formatted,
      },
    });

    return { recommendation, scores, passed };
  }, { name: "daily-outfit-recommendation" });

  console.log("Parsing outfit from recommendation...");
  const outfit = parseOutfitFromRecommendation(recommendation);
  console.log(`Parsed outfit: ${JSON.stringify(outfit, null, 2)}`);

  console.log("Sending SMS...");
  await deps.sendSms(recommendation);

  console.log("Saving outfit to history...");
  await deps.saveOutfitToHistory(outfit);

  console.log("Done!");
  return { recommendation, smsWasSent: true };
}

async function main() {
  await runDailyOutfit();
}

// Only run main when executed directly (not when imported)
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
