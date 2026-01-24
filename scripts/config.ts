/**
 * Centralized configuration for the daily outfit recommendation system.
 * Values can be overridden via environment variables where noted.
 */

export const CONFIG = {
  location: {
    name: process.env.LOCATION_NAME || "Sydney",
    latitude: Number(process.env.LOCATION_LAT) || -33.8688,
    longitude: Number(process.env.LOCATION_LNG) || 151.2093,
    timezone: "Australia/Sydney",
  },

  spreadsheet: {
    wardrobeId:
      process.env.WARDROBE_SPREADSHEET_ID ||
      "1Cx2KUswPEQypVMUPUTPtLOFQ3oGdme1TcFf7z5BZ_7k",
  },

  weatherRules: {
    outerLayerTempC: 21,
    layeringTempMinC: 20,
    layeringTempMaxC: 24,
    rainThresholdPercent: 40,
    uvThreshold: 8,
  },

  sms: {
    maxChars: 480,
    targetChars: 400,
  },

  history: {
    lookbackDays: 7,
  },
} as const;

export type Config = typeof CONFIG;
