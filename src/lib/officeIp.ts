/**
 * IPv4 containment, mirroring ipInCidr() in the attendance edge functions.
 *
 * Used only to tell an admin whether the IP their terminal is currently seen
 * from would pass the WiFi check — the decision that matters is made server
 * side. Kept deliberately identical in behaviour (including accepting a bare
 * address as an implicit /32) so the settings page can never claim a state the
 * check-in gate disagrees with.
 */

const toInt = (parts: number[]): number =>
  ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0

function parseIpv4(value: string): number[] | null {
  const parts = value.trim().split('.')
  if (parts.length !== 4) return null
  const nums = parts.map((p) => (/^\d{1,3}$/.test(p) ? Number(p) : NaN))
  return nums.every((n) => n >= 0 && n <= 255) ? nums : null
}

export function ipInCidr(ip: string, cidr: string): boolean {
  const [range, bits] = cidr.trim().split('/')
  // A bare address is an exact match, which is what a /32 means — and what an
  // admin who typed just "203.101.45.9" intended.
  const prefix = bits === undefined ? 32 : Number(bits)
  if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) return false

  const ipParts = parseIpv4(ip)
  const rangeParts = parseIpv4(range)
  if (!ipParts || !rangeParts) return false

  // A /0 mask would shift by 32, which JS treats as a shift by 0 — special-cased
  // rather than left to produce "matches nothing".
  const mask = prefix === 0 ? 0 : (~((1 << (32 - prefix)) - 1)) >>> 0
  return (toInt(ipParts) & mask) === (toInt(rangeParts) & mask)
}
