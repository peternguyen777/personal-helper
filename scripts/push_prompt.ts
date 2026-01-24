/**
 * Daily outfit prompt for Braintrust.
 * Push with: npx braintrust push push_prompt.ts
 */

import * as braintrust from "braintrust";

const project = braintrust.projects.create({ name: "daily-outfit-prompt" });

// Use triple braces {{{var}}} for unescaped HTML/text content
export const dailyOutfitPrompt = project.prompts.create({
  name: "Daily Outfit Recommendation",
  slug: "daily-outfit",
  description: "Generates outfit recommendations based on weather, wardrobe, and history",
  model: "claude-sonnet-4-20250514",
  params: {
    temperature: 1.0,
    max_tokens: 200,
  },
  messages: [
    {
      role: "user",
      content: `You are helping me decide what to wear today. Style: ametora (Japanese Americana) - natural materials, muted tones, relaxed fit, pieces that age well.

<weather>
Location: Sydney
Date: {{{date_formatted}}}
Local time: {{{local_time}}}
Current temperature: {{{temperature_c}}}°C (feels like {{{feels_like_c}}}°C)
Today's high: {{{high_c}}}°C
Conditions: {{{conditions}}}
Humidity: {{{humidity_percent}}}%
Wind: {{{wind_speed_kmh}}} km/h
Rain chance: {{{rain_chance_percent}}}% (current), {{{daily_rain_chance_percent}}}% (today)
UV index: {{{uv_index}}}
</weather>

<wardrobe>
{{{wardrobe_formatted}}}
</wardrobe>
{{{history_section}}}
Give me today's outfit recommendation. Keep under 400 characters for SMS. Use line breaks for readability.

IMPORTANT: Use the exact date from the weather data above (Date: {{{date_formatted}}}).

Format (use actual line breaks):
Good morning Peter, it is {{{date_formatted}}} in Sydney.
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

Use actual item names from my wardrobe. Plain text only, no markdown.`,
    },
  ],
});
