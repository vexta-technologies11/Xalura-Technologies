export type Platform = "instagram" | "facebook" | "tiktok" | "linkedin" | "twitter" | "youtube";
export type CaptionTone = "funny" | "inspiring" | "educational" | "promotional" | "casual" | "professional" | "emotional";
export type BusinessType = "restaurant" | "retail" | "fitness" | "beauty" | "tech" | "personal-brand" | "real-estate" | "general";
export type ContentGoal = "engagement" | "awareness" | "traffic" | "sales" | "entertainment";
export type CTAType = "none" | "link-in-bio" | "comment-below" | "follow-us" | "share" | "tag-a-friend" | "shop-now";

export interface CaptionParams {
  contentDescription: string;
  businessType: BusinessType;
  goal: ContentGoal;
  tones: CaptionTone[];
  hashtagCount: number;
  emojiLevel: "none" | "minimal" | "moderate" | "heavy";
  ctaType: CTAType;
}

export interface CaptionOption {
  id: string;
  body: string;
  hashtags: string[];
  totalChars: number;
}

export interface CaptionVariants {
  variants: CaptionOption[];
  platform: Platform;
  charLimit: number;
}

export async function generateCaptions(
  params: CaptionParams,
  platforms: Platform[],
): Promise<Record<Platform, CaptionVariants>> {
  const res = await fetch("/api/tools/captions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ params: { ...params, platforms } }),
  });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || "Generation failed");
  return JSON.parse(json.text);
}
