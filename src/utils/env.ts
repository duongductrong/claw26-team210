/**
 * Safely retrieves and cleans environment variables from double/single quotes, trailing comments, and whitespace.
 */
export function getEnv(key: string, defaultValue = ""): string {
  const val = process.env[key];
  if (!val) {
    return defaultValue;
  }

  // Strip trailing comments (e.g., "value # comment" -> "value")
  let cleaned = val.split(/(?:\s|^)#/)[0];
  cleaned = cleaned.trim();

  // Strip matching leading and trailing double or single quotes
  if (
    (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
    (cleaned.startsWith("'") && cleaned.endsWith("'"))
  ) {
    cleaned = cleaned.slice(1, -1);
  }

  return cleaned.trim() || defaultValue;
}
