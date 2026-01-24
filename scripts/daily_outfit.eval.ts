/**
 * Braintrust evals for the outfit recommendation prompt.
 * Run with: npx dotenv -e ../.env -- braintrust eval daily_outfit.eval.ts
 *
 * Uses hosted dataset and prompt from Braintrust
 */

import { Eval, initDataset, loadPrompt, wrapAnthropic, currentSpan } from "braintrust";
import Anthropic from "@anthropic-ai/sdk";
import type { Weather, WardrobeItem, HistoryEntry } from "./prompt.ts";
import {
  hasRequiredFields,
  underCharLimit,
  usesCorrectDate,
  respectsOuterRule,
  respectsBootsRule,
  respectsCapRule,
} from "./scorers.ts";

// Mock wardrobe (same as snapshot tests)
const mockWardrobe: WardrobeItem[] = [
  { Item: "Whitesville Tee", Category: "Top", Pillar: "Workwear", Quantity: 8, Description: "White heavyweight cotton tee" },
  { Item: "Buzz Rickson's Chambray", Category: "Top", Pillar: "Workwear", Quantity: 1, Description: "Light blue chambray work shirt" },
  { Item: "Kamakura OCBD", Category: "Top", Pillar: "Ivy", Quantity: 1, Description: "White oxford cloth button-down" },
  { Item: "OrSlow Fatigues", Category: "Bottom", Pillar: "Military", Quantity: 1, Description: "Olive green army fatigues" },
  { Item: "OrSlow 105 Jeans", Category: "Bottom", Pillar: "Workwear", Quantity: 1, Description: "Indigo selvedge denim" },
  { Item: "Alden Indy Boots", Category: "Shoes", Pillar: "Workwear", Quantity: 1, Description: "Brown leather work boots" },
  { Item: "Converse Chuck 70", Category: "Shoes", Pillar: "Sportswear", Quantity: 1, Description: "White canvas sneakers" },
  { Item: "Buzz Rickson's Deck Jacket", Category: "Outer", Pillar: "Military", Quantity: 1, Description: "Navy N-1 deck jacket" },
  { Item: "Ebbets Field Cap", Category: "Accessory", Pillar: "Sportswear", Quantity: 1, Description: "Wool baseball cap" },
  { Item: "Tochigi Leather Belt", Category: "Accessory", Pillar: "Workwear", Quantity: 1, Description: "Brown leather belt" },
];

// Test case type (matches structure in Braintrust dataset)
interface TestCase {
  input: {
    name: string;
    weather: Weather;
    history: HistoryEntry[];
    excludedTops: string[];
  };
  expected: {
    shouldHaveOuter: boolean;
    shouldPreferBoots: boolean;
    shouldSuggestCap: boolean;
  };
}

// Build wardrobe text for the prompt template
function formatWardrobe(wardrobe: WardrobeItem[]): string {
  return wardrobe
    .map(item => `- ${item.Item} (${item.Category}, ${item.Pillar || "N/A"}): ${item.Description || "N/A"}`)
    .join("\n");
}

// Build history section for the prompt template
function formatHistory(history: HistoryEntry[], wardrobe: WardrobeItem[]): string {
  if (history.length === 0) return "";

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

  return `
<recent_outfits>
RULES:
- DO NOT recommend these tops (already worn their max times this week): ${excludedTops.length > 0 ? excludedTops.join(", ") : "None - all tops available"}
- Try to vary bottoms (recently worn): ${bottomsWorn.length > 0 ? bottomsWorn.join(", ") : "None"}

Full history (last 7 days):
${history.map(h => `- ${h.Date}: Top=${h.Top || "N/A"}, Bottom=${h.Bottom || "N/A"}`).join("\n")}
</recent_outfits>`;
}

// Helper to parse outfit from response
function parseOutfit(response: string): Record<string, string> {
  const outfit: Record<string, string> = {};
  const patterns = ["Top", "Bottom", "Shoes", "Outer", "Accessory"];

  for (const field of patterns) {
    const match = response.match(new RegExp(`${field}:\\s*(.+?)(?:\\n|$)`, "i"));
    if (match) {
      outfit[field.toLowerCase()] = match[1].trim();
    }
  }
  return outfit;
}

// Local scorers (depend on local mockWardrobe data)
const usesWardrobeItems = (args: { output: string }) => {
  const outfit = parseOutfit(args.output);
  const wardrobeItems = mockWardrobe.map(w => w.Item.toLowerCase());

  const fields = ["top", "bottom", "shoes", "outer", "accessory"];
  let validCount = 0;
  let totalCount = 0;
  const issues: string[] = [];

  for (const field of fields) {
    if (outfit[field]) {
      totalCount++;
      // Handle layered tops like "Whitesville Tee + Buzz Rickson's Chambray (unbuttoned)"
      const items = outfit[field].split("+").map(s => s.replace(/\(.*\)/, "").trim().toLowerCase());
      const allValid = items.every(item =>
        wardrobeItems.some(w => item.includes(w) || w.includes(item))
      );
      if (allValid) {
        validCount++;
      } else {
        issues.push(`${field}: "${outfit[field]}" not in wardrobe`);
      }
    }
  }

  return {
    name: "uses_wardrobe_items",
    score: totalCount > 0 ? validCount / totalCount : 0,
    metadata: { validCount, totalCount, issues },
  };
};

const respectsExcludedTops = (args: { output: string; expected: TestCase["expected"]; input: TestCase["input"] }) => {
  const outfit = parseOutfit(args.output);
  const excludedTops = args.input.excludedTops.map(t => t.toLowerCase());

  if (excludedTops.length === 0) {
    return { name: "respects_excluded_tops", score: 1, metadata: { skipped: true } };
  }

  const topValue = (outfit.top || "").toLowerCase();
  const usedExcluded = excludedTops.some(excluded => topValue.includes(excluded.toLowerCase()));

  return {
    name: "respects_excluded_tops",
    score: usedExcluded ? 0 : 1,
    metadata: { excludedTops, actualTop: outfit.top, usedExcluded },
  };
};

// Main eval - wrap Anthropic client for automatic prompt tracing
const client = wrapAnthropic(new Anthropic());

// Load test scenarios from Braintrust-hosted dataset
const dataset = initDataset("daily-outfit-prompt", { dataset: "test-scenarios" });

// Cache for the loaded prompt (loaded once on first use)
let outfitPromptCache: Awaited<ReturnType<typeof loadPrompt>> | null = null;

async function getOutfitPrompt() {
  if (!outfitPromptCache) {
    outfitPromptCache = await loadPrompt({
      projectName: "daily-outfit-prompt",
      slug: "daily-outfit",
    });
  }
  return outfitPromptCache;
}

Eval("daily-outfit-prompt", {
  data: dataset,

  task: async (input) => {
    // Load hosted prompt from Braintrust (cached after first load)
    const outfitPrompt = await getOutfitPrompt();

    // Build template variables for the hosted prompt
    const templateVars = {
      ...input.weather,
      wardrobe_formatted: formatWardrobe(mockWardrobe),
      history_section: formatHistory(input.history, mockWardrobe),
    };

    // Render the prompt with variables - includes span_info for tracking
    const rendered = outfitPrompt.build(templateVars);
    const messages = rendered.messages as Array<{ role: "user" | "assistant"; content: string }>;

    // Log prompt metadata to the current span for version tracking
    if (rendered.span_info) {
      currentSpan().log({ metadata: rendered.span_info.metadata });
    }

    const message = await client.messages.create({
      model: rendered.model || "claude-sonnet-4-20250514",
      max_tokens: 200,
      temperature: 1.0,
      messages,
    });

    return (message.content[0] as { text: string }).text;
  },

  scores: [
    // Imported from scorers.ts (also pushed to Braintrust)
    hasRequiredFields,
    underCharLimit,
    usesCorrectDate,
    // Cast scorers that depend on `expected` field (which our dataset provides)
    respectsOuterRule as any,
    respectsBootsRule as any,
    respectsCapRule as any,
    // Local scorers (depend on mockWardrobe data)
    usesWardrobeItems,
    respectsExcludedTops as any,
  ],
});
