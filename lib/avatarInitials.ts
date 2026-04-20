/** Two-letter initials for avatar fallback (Apple Contacts–style). */
export function avatarInitials(name: string): string {
  const t = name.trim();
  if (!t) return "?";
  const parts = t.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const a = parts[0]![0];
    const b = parts[parts.length - 1]![0];
    return `${a}${b}`.toUpperCase();
  }
  return t.slice(0, 2).toUpperCase();
}

/** Stable hue 0–360 from name for placeholder gradient */
export function avatarHue(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h += name.charCodeAt(i);
  return h % 360;
}
