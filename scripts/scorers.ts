/**
 * Braintrust scorers for daily outfit evaluation.
 * Push with: npx braintrust push scorers.ts
 *
 * These scorers are both:
 * 1. Pushed to Braintrust for use in their UI
 * 2. Exported for local use in evals
 */

import * as braintrust from "braintrust";
import { z } from "zod";

const project = braintrust.projects.create({ name: "daily-outfit-prompt" });

// Helper to parse outfit fields from response
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

// ============================================
// Scorer definitions (pushed to Braintrust)
// ============================================

project.scorers.create({
  name: "Has Required Fields",
  slug: "has-required-fields",
  parameters: z.object({
    output: z.string(),
  }),
  handler: async ({ output }) => {
    const outfit = parseOutfit(output);
    const hasTop = !!outfit.top;
    const hasBottom = !!outfit.bottom;
    const hasShoes = !!outfit.shoes;

    return {
      score: hasTop && hasBottom && hasShoes ? 1 : 0,
      metadata: { hasTop, hasBottom, hasShoes },
    };
  },
});

project.scorers.create({
  name: "Under Char Limit",
  slug: "under-char-limit",
  parameters: z.object({
    output: z.string(),
  }),
  handler: async ({ output }) => {
    const length = output.length;
    const limit = 480;

    return {
      score: length <= limit ? 1 : 0,
      metadata: { length, limit },
    };
  },
});

project.scorers.create({
  name: "Uses Correct Date",
  slug: "uses-correct-date",
  parameters: z.object({
    output: z.string(),
    input: z.object({
      weather: z.object({
        date_formatted: z.string(),
      }),
    }),
  }),
  handler: async ({ output, input }) => {
    const expectedDate = input.weather.date_formatted;
    const hasDate = output.includes(expectedDate);

    return {
      score: hasDate ? 1 : 0,
      metadata: { expectedDate, found: hasDate },
    };
  },
});

project.scorers.create({
  name: "Respects Outer Rule",
  slug: "respects-outer-rule",
  parameters: z.object({
    output: z.string(),
    expected: z.object({
      shouldHaveOuter: z.boolean(),
    }),
    input: z.object({
      weather: z.object({
        high_c: z.number(),
      }),
    }),
  }),
  handler: async ({ output, expected, input }) => {
    const outfit = parseOutfit(output);
    const hasOuter = !!outfit.outer;
    const shouldHaveOuter = expected.shouldHaveOuter;
    const correct = hasOuter === shouldHaveOuter;

    return {
      score: correct ? 1 : 0,
      metadata: { hasOuter, shouldHaveOuter, temp: input.weather.high_c },
    };
  },
});

project.scorers.create({
  name: "Respects Boots Rule",
  slug: "respects-boots-rule",
  parameters: z.object({
    output: z.string(),
    expected: z.object({
      shouldPreferBoots: z.boolean(),
    }),
    input: z.object({
      weather: z.object({
        daily_rain_chance_percent: z.number(),
      }),
    }),
  }),
  handler: async ({ output, expected, input }) => {
    const outfit = parseOutfit(output);
    const shoes = (outfit.shoes || "").toLowerCase();
    const hasBoots = shoes.includes("boot");
    const shouldPreferBoots = expected.shouldPreferBoots;

    if (!shouldPreferBoots) {
      return {
        score: 1,
        metadata: { skipped: true, rain: input.weather.daily_rain_chance_percent },
      };
    }

    return {
      score: hasBoots ? 1 : 0,
      metadata: { shoes: outfit.shoes, hasBoots, rain: input.weather.daily_rain_chance_percent },
    };
  },
});

project.scorers.create({
  name: "Respects Cap Rule",
  slug: "respects-cap-rule",
  parameters: z.object({
    output: z.string(),
    expected: z.object({
      shouldSuggestCap: z.boolean(),
    }),
    input: z.object({
      weather: z.object({
        uv_index: z.number(),
      }),
    }),
  }),
  handler: async ({ output, expected, input }) => {
    const outfit = parseOutfit(output);
    const accessory = (outfit.accessory || "").toLowerCase();
    const hasCap = accessory.includes("cap") || accessory.includes("hat");
    const shouldSuggestCap = expected.shouldSuggestCap;

    if (!shouldSuggestCap) {
      return {
        score: 1,
        metadata: { skipped: true, uv: input.weather.uv_index },
      };
    }

    return {
      score: hasCap ? 1 : 0,
      metadata: { accessory: outfit.accessory, hasCap, uv: input.weather.uv_index },
    };
  },
});

// ============================================
// Exported scorer functions (for local evals)
// ============================================

export const hasRequiredFields = (args: { output: string }) => {
  const outfit = parseOutfit(args.output);
  const hasTop = !!outfit.top;
  const hasBottom = !!outfit.bottom;
  const hasShoes = !!outfit.shoes;

  return {
    name: "has_required_fields",
    score: hasTop && hasBottom && hasShoes ? 1 : 0,
    metadata: { hasTop, hasBottom, hasShoes },
  };
};

export const underCharLimit = (args: { output: string }) => {
  const length = args.output.length;
  const limit = 480;

  return {
    name: "under_char_limit",
    score: length <= limit ? 1 : 0,
    metadata: { length, limit },
  };
};

export const usesCorrectDate = (args: { output: string; input: { weather: { date_formatted: string } } }) => {
  const expectedDate = args.input.weather.date_formatted;
  const hasDate = args.output.includes(expectedDate);

  return {
    name: "uses_correct_date",
    score: hasDate ? 1 : 0,
    metadata: { expectedDate, found: hasDate },
  };
};

export const respectsOuterRule = (args: {
  output: string;
  expected: { shouldHaveOuter: boolean };
  input: { weather: { high_c: number } };
}) => {
  const outfit = parseOutfit(args.output);
  const hasOuter = !!outfit.outer;
  const shouldHaveOuter = args.expected.shouldHaveOuter;
  const correct = hasOuter === shouldHaveOuter;

  return {
    name: "respects_outer_rule",
    score: correct ? 1 : 0,
    metadata: { hasOuter, shouldHaveOuter, temp: args.input.weather.high_c },
  };
};

export const respectsBootsRule = (args: {
  output: string;
  expected: { shouldPreferBoots: boolean };
  input: { weather: { daily_rain_chance_percent: number } };
}) => {
  const outfit = parseOutfit(args.output);
  const shoes = (outfit.shoes || "").toLowerCase();
  const hasBoots = shoes.includes("boot");
  const shouldPreferBoots = args.expected.shouldPreferBoots;

  if (!shouldPreferBoots) {
    return {
      name: "respects_boots_rule",
      score: 1,
      metadata: { skipped: true, rain: args.input.weather.daily_rain_chance_percent },
    };
  }

  return {
    name: "respects_boots_rule",
    score: hasBoots ? 1 : 0,
    metadata: { shoes: outfit.shoes, hasBoots, rain: args.input.weather.daily_rain_chance_percent },
  };
};

export const respectsCapRule = (args: {
  output: string;
  expected: { shouldSuggestCap: boolean };
  input: { weather: { uv_index: number } };
}) => {
  const outfit = parseOutfit(args.output);
  const accessory = (outfit.accessory || "").toLowerCase();
  const hasCap = accessory.includes("cap") || accessory.includes("hat");
  const shouldSuggestCap = args.expected.shouldSuggestCap;

  if (!shouldSuggestCap) {
    return {
      name: "respects_cap_rule",
      score: 1,
      metadata: { skipped: true, uv: args.input.weather.uv_index },
    };
  }

  return {
    name: "respects_cap_rule",
    score: hasCap ? 1 : 0,
    metadata: { accessory: outfit.accessory, hasCap, uv: args.input.weather.uv_index },
  };
};
