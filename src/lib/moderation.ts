const HARD_BLOCK_PATTERNS: Array<{
  label: string;
  pattern: RegExp;
}> = [
  { label: "guns", pattern: /\b(gun|guns|firearm|firearms|pistol|pistols|rifle|rifles|shotgun|shotguns|ammo|ammunition)\b/i },
  { label: "explosives", pattern: /\b(bomb|bombs|explosive|explosives|grenade|grenades|detonator|c4|dynamite)\b/i },
  { label: "drugs", pattern: /\b(cocaine|heroin|meth|methamphetamine|weed|marijuana|cannabis|ecstasy|mdma|opium|ketamine)\b/i },
  { label: "adult content", pattern: /\b(adult|18\+|explicit|nsfw|pornographic)\b/i },
];

const REVIEW_PATTERNS: Array<{
  label: string;
  pattern: RegExp;
}> = [
  { label: "weapon accessories", pattern: /\b(taser|tasers|pepper spray|bulletproof|silencer)\b/i },
  { label: "unsafe chemicals", pattern: /\b(acid|poison|toxic chemical)\b/i },
];

export type ModerationResult =
  | { outcome: "allow"; matches: string[] }
  | { outcome: "review"; matches: string[] }
  | { outcome: "block"; matches: string[] };

const normalizeText = (value: unknown) =>
  String(value || "")
    .replace(/\s+/g, " ")
    .trim();

export const moderateListingContent = (input: {
  title?: unknown;
  description?: unknown;
  subCategory?: unknown;
  metadata?: Record<string, unknown> | null;
}): ModerationResult => {
  const metadataText = Object.entries(input.metadata || {})
    .filter(([, value]) => ["string", "number", "boolean"].includes(typeof value))
    .map(([, value]) => String(value))
    .join(" ");

  const haystack = normalizeText(
    [input.title, input.description, input.subCategory, metadataText].join(" "),
  );

  const blockMatches = HARD_BLOCK_PATTERNS.filter(({ pattern }) =>
    pattern.test(haystack),
  ).map(({ label }) => label);

  if (blockMatches.length > 0) {
    return { outcome: "block", matches: blockMatches };
  }

  const reviewMatches = REVIEW_PATTERNS.filter(({ pattern }) =>
    pattern.test(haystack),
  ).map(({ label }) => label);

  if (reviewMatches.length > 0) {
    return { outcome: "review", matches: reviewMatches };
  }

  return { outcome: "allow", matches: [] };
};
