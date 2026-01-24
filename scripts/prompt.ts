/**
 * Outfit prompt builder - shared between main script and evals.
 */

// Types
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

export function buildPrompt(
  weather: Weather,
  wardrobe: WardrobeItem[],
  history: HistoryEntry[]
): string {
  // Format wardrobe for the prompt
  const wardrobeText = wardrobe
    .map(item => `- ${item.Item} (${item.Category}, ${item.Pillar || "N/A"}): ${item.Description || "N/A"}`)
    .join("\n");

  // Format recent outfit history with quantity-aware exclusions
  let historyText = "";
  if (history.length > 0) {
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

    historyText = `
<recent_outfits>
RULES:
- DO NOT recommend these tops (already worn their max times this week): ${excludedTops.length > 0 ? excludedTops.join(", ") : "None - all tops available"}
- Try to vary bottoms (recently worn): ${bottomsWorn.length > 0 ? bottomsWorn.join(", ") : "None"}

Full history (last 7 days):
${history.map(h => `- ${h.Date}: Top=${h.Top || "N/A"}, Bottom=${h.Bottom || "N/A"}`).join("\n")}
</recent_outfits>`;
  }

  return `You are helping me decide what to wear today. Style: ametora (Japanese Americana) - natural materials, muted tones, relaxed fit, pieces that age well.

<weather>
Location: Sydney
Date: ${weather.date_formatted}
Local time: ${weather.local_time}
Current temperature: ${weather.temperature_c}°C (feels like ${weather.feels_like_c}°C)
Today's high: ${weather.high_c}°C
Conditions: ${weather.conditions}
Humidity: ${weather.humidity_percent}%
Wind: ${weather.wind_speed_kmh} km/h
Rain chance: ${weather.rain_chance_percent}% (current), ${weather.daily_rain_chance_percent}% (today)
UV index: ${weather.uv_index}
</weather>

<wardrobe>
${wardrobeText}
</wardrobe>
${historyText}
Give me today's outfit recommendation. Keep under 400 characters for SMS. Use line breaks for readability.

IMPORTANT: Use the exact date from the weather data above (Date: ${weather.date_formatted}).

Format (use actual line breaks):
Good morning Peter, it is ${weather.date_formatted} in Sydney.
The weather today is [today's high]°C, [humidity]% humidity, [conditions].

[Brief explanation of outfit choice based on weather + styling tip]

Top: [item]
Bottom: [item]
Shoes: [item]
Accessory: [item if appropriate]

REQUIRED: Always include Top, Bottom, and Shoes with their labels.

LAYERING OPTION: In mild weather (20-24°C), you can recommend a white tee as an underlayer with an unbuttoned shirt. Format as "Top: [tee] + [shirt] (unbuttoned)"

Example 1 (hot/humid day):
Good morning Peter, it is [Day Date] in Sydney.
The weather today is [today's high]°C, [humidity]% humidity, [conditions].

[1-2 sentence explanation of why this outfit works for the weather + a styling tip]

Top: [breathable shirt from wardrobe]
Bottom: [lightweight pants from wardrobe]
Shoes: [appropriate footwear]
Accessory: [optional - belt or other if appropriate]

Example 2 (mild layering weather):
Good morning Peter, it is [Day Date] in Sydney.
The weather today is [today's high]°C, [humidity]% humidity, [conditions].

[1-2 sentence explanation of layering choice + styling tip]

Top: [tee] + [shirt] (unbuttoned)
Bottom: [pants from wardrobe]
Shoes: [appropriate footwear]
Accessory: [optional - belt from wardrobe]

Example 3 (cooler weather):
Good morning Peter, it is [Day Date] in Sydney.
The weather today is [today's high]°C, [humidity]% humidity, [conditions].

[1-2 sentence explanation of layering choice + styling tip]

Top: [shirt from wardrobe]
Bottom: [pants from wardrobe]
Shoes: [appropriate footwear]
Outer: [outer layer from wardrobe]
Accessory: [optional - belt from wardrobe]

CRITICAL: You MUST NOT recommend any top that appears in the "DO NOT recommend" list above. Pick a different top from the wardrobe.

COLOR COORDINATION RULES:
- NEVER pair the same shade of color for top and bottom (e.g., light blue shirt + light blue wash jeans is bad)
- Different shades of the same color family are OK (e.g., chambray + indigo denim works - light blue + dark blue)
- Create tonal contrast: light top + dark bottom OR dark top + light bottom
- Bad combos to avoid: light blue top + light blue bottoms, olive top + olive bottoms, ecru top + ecru bottoms

WEATHER RULES:
- Outer layer: Only include if temp < 21°C
- Rain > 40%: Prefer boots over canvas shoes
- UV ≥ 8: Suggest a cap/hat

Use actual item names from my wardrobe. Plain text only, no markdown.`;
}
