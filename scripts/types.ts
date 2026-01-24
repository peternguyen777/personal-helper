/**
 * Shared type definitions for the daily outfit recommendation system.
 */

export interface Weather {
  temperature_c: number;
  feels_like_c: number;
  humidity_percent: number;
  wind_speed_kmh: number;
  rain_chance_percent: number;
  conditions: string;
  high_c: number;
  low_c: number;
  daily_rain_chance_percent: number;
  uv_index: number;
  local_time: string;
  date_formatted: string;
}

export interface WardrobeItem {
  Item: string;
  Category: string;
  Pillar?: string;
  Quantity: number;
  Description?: string;
}

export interface HistoryEntry {
  Date: string;
  Top: string;
  Bottom: string;
  Shoes: string;
  Outer: string;
  Accessory: string;
}
