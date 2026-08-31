// Smart Gemini API Key Pool with dynamic load balancing and zero-latency circuit breaking
// Avoids single-key exhaustion and skips dead/cooling-down keys with 0ms penalty.

const keyCooldowns = new Map<string, number>();

/**
 * Discovers all Gemini API keys configured in Supabase environment secrets.
 * Supports Gemini_API_Key, Gemini_API_Key_2, Gemini_API_Key_3, GEMINI_API_KEY,
 * and dynamically discovers any additional Gemini_API_Key_N variables.
 */
export function getAllGeminiKeys(): string[] {
  const discovered = new Set<string>();

  // Check 1 through 10 with all common casing variations
  for (let i = 1; i <= 10; i++) {
    const suffix = i === 1 ? "" : `_${i}`;
    const explicitNames = [
      `Gemini_API_Key${suffix}`,
      `gemini_api_key${suffix}`,
      `GEMINI_API_KEY${suffix}`,
      `Gemini_Api_Key${suffix}`,
      `GEMINI_KEY${suffix}`,
    ];
    for (const name of explicitNames) {
      const val = Deno.env.get(name)?.trim();
      if (val && val.length > 0) {
        discovered.add(val);
      }
    }
  }

  // Scan all environment variables for any other gemini keys
  try {
    const allEnv = Deno.env.toObject();
    for (const [k, v] of Object.entries(allEnv)) {
      if (/gemini.*key/i.test(k)) {
        const val = v?.trim();
        if (val && val.length > 0) {
          discovered.add(val);
        }
      }
    }
  } catch {
    // Deno env permissions fallback
  }

  return Array.from(discovered);
}

/**
 * Returns the pool of Gemini keys with:
 * 1. Cooled-down/exhausted keys moved to the back (or skipped if healthy keys exist).
 * 2. Healthy keys shuffled / load-balanced randomly so traffic is evenly split across all keys.
 */
export function getPrioritizedGeminiKeys(): string[] {
  const allKeys = getAllGeminiKeys();
  if (allKeys.length === 0) return [];

  const now = Date.now();
  const healthy: string[] = [];
  const coolingDown: { key: string; expiry: number }[] = [];

  for (const key of allKeys) {
    const expiry = keyCooldowns.get(key) ?? 0;
    if (now >= expiry) {
      healthy.push(key);
    } else {
      coolingDown.push({ key, expiry });
    }
  }

  // Sort cooling down keys by which one recovers earliest
  coolingDown.sort((a, b) => a.expiry - b.expiry);
  const sortedCooling = coolingDown.map((c) => c.key);

  // If we have healthy keys, randomly rotate/shuffle them for even load balancing
  if (healthy.length > 0) {
    // Random offset rotation so all healthy keys share equal 1/N traffic
    const offset = Math.floor(Math.random() * healthy.length);
    const loadBalancedHealthy = [
      ...healthy.slice(offset),
      ...healthy.slice(0, offset),
    ];
    return [...loadBalancedHealthy, ...sortedCooling];
  }

  // If ALL keys are in cooldown, try the one that will recover soonest
  return sortedCooling;
}

/**
 * Marks a key as cooling down when it hits a 429 Quota Exceeded or 503 Overloaded.
 * Default cooldown: 5 minutes for 429, 30 seconds for 503.
 */
export function markGeminiKeyCooldown(key: string, status = 429, customMs?: number): void {
  const cooldownMs = customMs ?? (status === 429 ? 5 * 60 * 1000 : 30 * 1000);
  keyCooldowns.set(key, Date.now() + cooldownMs);
}

/**
 * Clears cooldown on successful response to keep pool accurate.
 */
export function markGeminiKeySuccess(key: string): void {
  keyCooldowns.delete(key);
}
