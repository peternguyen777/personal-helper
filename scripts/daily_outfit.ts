/**
 * Daily outfit recommendation script.
 * Fetches weather, reads wardrobe from Google Sheets, gets Claude's recommendation,
 * and sends it via SMS.
 */

import Anthropic from "@anthropic-ai/sdk";
import { initLogger, wrapAnthropic } from "braintrust";
import { config } from "dotenv";
import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";
import Twilio from "twilio";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { buildPrompt, type Weather, type WardrobeItem, type HistoryEntry } from "./prompt.ts";

// Re-export for backwards compatibility
export { buildPrompt, type Weather, type WardrobeItem, type HistoryEntry } from "./prompt.ts";

// Load .env file if it exists (for local development)
const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, "..", ".env") });

// Initialize Braintrust logger for production monitoring
const logger = initLogger({
  projectName: "daily-outfit-prompt",
  apiKey: process.env.BRAINTRUST_API_KEY,
});

// Constants
const SYDNEY_LAT = -33.8688;
const SYDNEY_LON = 151.2093;
const WARDROBE_SPREADSHEET_ID = "1Cx2KUswPEQypVMUPUTPtLOFQ3oGdme1TcFf7z5BZ_7k";

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

async function fetchWeather(): Promise<Weather> {
  const params = new URLSearchParams({
    latitude: SYDNEY_LAT.toString(),
    longitude: SYDNEY_LON.toString(),
    current: "temperature_2m,relative_humidity_2m,apparent_temperature,precipitation_probability,weather_code,wind_speed_10m",
    daily: "temperature_2m_max,temperature_2m_min,precipitation_probability_max,uv_index_max",
    timezone: "Australia/Sydney",
    forecast_days: "1"
  });

  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
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

  const doc = new GoogleSpreadsheet(WARDROBE_SPREADSHEET_ID, jwt);
  await doc.loadInfo();
  return doc;
}

async function fetchWardrobe(): Promise<WardrobeItem[]> {
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

async function fetchOutfitHistory(days: number = 7): Promise<HistoryEntry[]> {
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

async function getOutfitRecommendation(
  weather: Weather,
  wardrobe: WardrobeItem[],
  history: HistoryEntry[]
): Promise<string> {
  // Wrap Anthropic client for Braintrust logging
  const client = wrapAnthropic(new Anthropic());
  const prompt = buildPrompt(weather, wardrobe, history);

  const message = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 200,
    temperature: 1.0,
    messages: [{ role: "user", content: prompt }]
  });

  let response = (message.content[0] as { text: string }).text;

  // Cap at 480 chars (3 SMS segments)
  const maxLen = 480;
  if (response.length > maxLen) {
    response = response.slice(0, maxLen - 3) + "...";
  }

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

async function main() {
  // Debug: Show timezone calculation
  const sydneyNow = getSydneyTime();
  const utcNow = new Date();
  console.log(`UTC time: ${utcNow.toISOString()}`);
  console.log(`Sydney time: ${sydneyNow.toISOString()}`);
  console.log(`Date formatted: ${formatDate(sydneyNow)}`);

  console.log("Fetching weather...");
  const weather = await fetchWeather();
  console.log(`Weather API response: ${JSON.stringify(weather, null, 2)}`);

  console.log("Fetching wardrobe...");
  const wardrobe = await fetchWardrobe();
  console.log(`Wardrobe API response (${wardrobe.length} items): ${JSON.stringify(wardrobe, null, 2)}`);

  console.log("Fetching outfit history...");
  const history = await fetchOutfitHistory(7);
  console.log(`Outfit history (last 7 days): ${JSON.stringify(history, null, 2)}`);

  console.log("Getting recommendation from Claude...");
  const recommendation = await getOutfitRecommendation(weather, wardrobe, history);
  console.log(`Recommendation (${recommendation.length} chars): ${recommendation}`);

  console.log("Parsing outfit from recommendation...");
  const outfit = parseOutfitFromRecommendation(recommendation);
  console.log(`Parsed outfit: ${JSON.stringify(outfit, null, 2)}`);

  console.log("Sending SMS...");
  await sendSms(recommendation);

  console.log("Saving outfit to history...");
  await saveOutfitToHistory(outfit);

  console.log("Done!");
}

// Only run main when executed directly (not when imported)
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  main().catch(console.error);
}
