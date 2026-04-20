/** Supabase Storage bucket — create via SQL in supabase/schema.sql or Dashboard */
export const EMPLOYEE_AVATAR_BUCKET = "employee-avatars";

const MAX_BYTES = 8 * 1024 * 1024;

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

export function validateAvatarFile(file: File): string | null {
  if (file.size > MAX_BYTES) return "Photo must be 8 MB or smaller.";
  const lower = file.name.toLowerCase();
  const extOk =
    lower.endsWith(".jpg") ||
    lower.endsWith(".jpeg") ||
    lower.endsWith(".png") ||
    lower.endsWith(".webp") ||
    lower.endsWith(".heic") ||
    lower.endsWith(".heif");
  const t = file.type.toLowerCase();
  if (t && !ALLOWED_TYPES.has(t) && !extOk) {
    return "Use JPEG, PNG, WebP, or HEIC.";
  }
  if (!t && !extOk) {
    return "Use JPEG, PNG, WebP, or HEIC.";
  }
  return null;
}

export function extensionForFile(file: File): string {
  const n = file.name.toLowerCase();
  if (n.endsWith(".jpeg") || n.endsWith(".jpg")) return "jpg";
  if (n.endsWith(".png")) return "png";
  if (n.endsWith(".webp")) return "webp";
  if (n.endsWith(".heic")) return "heic";
  if (n.endsWith(".heif")) return "heif";
  const t = file.type.toLowerCase();
  if (t.includes("jpeg") || t === "image/jpg") return "jpg";
  if (t.includes("png")) return "png";
  if (t.includes("webp")) return "webp";
  if (t.includes("heic") || t.includes("heif")) return "heic";
  return "jpg";
}
