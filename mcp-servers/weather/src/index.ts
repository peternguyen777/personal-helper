import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

interface WeatherResponse {
  city: string;
  temp_c: number;
  feels_like_c: number;
  humidity_percent: number;
  rain_chance_percent: number;
  uv_index: number;
  wind_kmh: number;
  conditions: string;
}

// Australian city BOM station IDs
const BOM_STATIONS: Record<string, { id: string; wmo: string }> = {
  sydney: { id: "IDN60901", wmo: "94768" },
  melbourne: { id: "IDV60901", wmo: "94866" },
  brisbane: { id: "IDQ60901", wmo: "94576" },
  perth: { id: "IDW60901", wmo: "94608" },
  adelaide: { id: "IDS60901", wmo: "94672" },
  canberra: { id: "IDN60903", wmo: "94926" },
  hobart: { id: "IDT60901", wmo: "94970" },
  darwin: { id: "IDD60901", wmo: "94120" },
};

// Major city coordinates for Open-Meteo
const CITY_COORDS: Record<string, { lat: number; lon: number }> = {
  tokyo: { lat: 35.6762, lon: 139.6503 },
  london: { lat: 51.5074, lon: -0.1278 },
  "new york": { lat: 40.7128, lon: -74.006 },
  paris: { lat: 48.8566, lon: 2.3522 },
  singapore: { lat: 1.3521, lon: 103.8198 },
  "hong kong": { lat: 22.3193, lon: 114.1694 },
  osaka: { lat: 34.6937, lon: 135.5023 },
  "los angeles": { lat: 34.0522, lon: -118.2437 },
  "san francisco": { lat: 37.7749, lon: -122.4194 },
  seattle: { lat: 47.6062, lon: -122.3321 },
};

async function getAustralianWeather(city: string): Promise<WeatherResponse> {
  const station = BOM_STATIONS[city.toLowerCase()];
  if (!station) {
    throw new Error(`Unknown Australian city: ${city}`);
  }

  const url = `http://www.bom.gov.au/fwo/${station.id}/${station.id}.${station.wmo}.json`;

  const response = await fetch(url, {
    headers: {
      "User-Agent": "weather-mcp-server/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(`BOM API error: ${response.status}`);
  }

  const data = await response.json();
  const obs = data.observations.data[0];

  return {
    city: city.charAt(0).toUpperCase() + city.slice(1),
    temp_c: obs.air_temp,
    feels_like_c: obs.apparent_t,
    humidity_percent: obs.rel_hum,
    rain_chance_percent: 0, // BOM observations don't include forecast
    uv_index: 0, // Would need separate UV endpoint
    wind_kmh: obs.wind_spd_kmh,
    conditions: obs.weather || "Clear",
  };
}

async function getInternationalWeather(city: string): Promise<WeatherResponse> {
  const coords = CITY_COORDS[city.toLowerCase()];
  if (!coords) {
    throw new Error(
      `Unknown city: ${city}. Supported cities: ${Object.keys(CITY_COORDS).join(", ")}`
    );
  }

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&daily=precipitation_probability_max,uv_index_max&timezone=auto`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Open-Meteo API error: ${response.status}`);
  }

  const data = await response.json();
  const current = data.current;
  const daily = data.daily;

  // Map WMO weather codes to conditions
  const weatherCodes: Record<number, string> = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Foggy",
    48: "Depositing rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    61: "Slight rain",
    63: "Moderate rain",
    65: "Heavy rain",
    71: "Slight snow",
    73: "Moderate snow",
    75: "Heavy snow",
    80: "Slight rain showers",
    81: "Moderate rain showers",
    82: "Violent rain showers",
    95: "Thunderstorm",
    96: "Thunderstorm with slight hail",
    99: "Thunderstorm with heavy hail",
  };

  return {
    city: city
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" "),
    temp_c: Math.round(current.temperature_2m),
    feels_like_c: Math.round(current.apparent_temperature),
    humidity_percent: current.relative_humidity_2m,
    rain_chance_percent: daily.precipitation_probability_max[0] || 0,
    uv_index: Math.round(daily.uv_index_max[0] || 0),
    wind_kmh: Math.round(current.wind_speed_10m),
    conditions: weatherCodes[current.weather_code] || "Unknown",
  };
}

async function getWeather(city: string): Promise<WeatherResponse> {
  const normalizedCity = city.toLowerCase().trim();

  // Check if it's an Australian city
  if (BOM_STATIONS[normalizedCity]) {
    return getAustralianWeather(normalizedCity);
  }

  // Check if it's a known international city
  if (CITY_COORDS[normalizedCity]) {
    return getInternationalWeather(normalizedCity);
  }

  // Try Australian cities first as default
  throw new Error(
    `Unknown city: ${city}. Supported Australian cities: ${Object.keys(BOM_STATIONS).join(", ")}. Supported international cities: ${Object.keys(CITY_COORDS).join(", ")}`
  );
}

// Create MCP server
const server = new McpServer({
  name: "weather",
  version: "1.0.0",
});

// Register the get_weather tool
server.tool(
  "get_weather",
  "Get current weather conditions for a city. Returns temperature, feels-like, humidity, rain chance, UV index, wind speed, and conditions.",
  {
    city: z
      .string()
      .describe(
        "City name (e.g., 'Sydney', 'Tokyo', 'London'). Defaults to Sydney if not specified."
      ),
  },
  async ({ city }) => {
    try {
      const weather = await getWeather(city || "sydney");
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(weather, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
