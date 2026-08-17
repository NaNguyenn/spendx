/**
 * Up to two initials from a Display Name, uppercased — "Minh Trần" → "MT",
 * "Duy" → "D", "" → "". Feeds the Avatar component (design's `j5xqGq`,
 * "Component — Avatar": initials on accent-soft) wherever a User is shown
 * without a photo — Friend Requests and the Friends list for now.
 */
export function initials(displayName: string): string {
  return displayName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();
}
