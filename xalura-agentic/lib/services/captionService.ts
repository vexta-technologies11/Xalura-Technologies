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

const platformLimits: Record<Platform, number> = {
  instagram: 2200,
  facebook: 63206,
  tiktok: 2200,
  linkedin: 3000,
  twitter: 280,
  youtube: 5000,
};

const mockBodies: Record<Platform, string[]> = {
  instagram: [
    "This is the moment we've been waiting for. Pure magic in every frame. ✨",
    "Behind every great day is a morning coffee and a positive mindset. Who's with us? ☕",
    "New chapter loading… and it's looking better than we imagined. 🚀",
  ],
  facebook: [
    "We wanted to share something special with our community today. This has been a journey, and we're so grateful for every single one of you who's been along for the ride.",
    "Big news coming your way! We've been working on something behind the scenes and we can't wait to show you what we've been up to.",
  ],
  tiktok: [
    "POV: You just found your new favorite thing 🎬✨ #fyp #viral",
    "Wait for it… 😱 The end result is INSANE 🔥",
  ],
  linkedin: [
    "I'm excited to share some key insights from our latest project. Here's what we learned about driving meaningful results in today's market.",
    "Reflecting on the past quarter, one thing is clear: our team's dedication to excellence has never been stronger.",
  ],
  twitter: [
    "This is the tweet. The one. The only. 🐦",
    "Hot take: the best investment you can make is in yourself. Thoughts?",
  ],
  youtube: [
    "In this video, we dive deep into the topic that everyone's been asking about. From the basics to advanced strategies, we cover everything you need to know.",
    "Welcome back to the channel! Today we're breaking down the most important concepts in a way that's easy to understand and apply.",
  ],
};

const mockHashtags: Record<string, string[]> = {
  general: ["#trending", "#viral", "#content", "#creator", "#explore"],
  tech: ["#technology", "#innovation", "#AI", "#future", "#tech"],
  fitness: ["#fitness", "#health", "#wellness", "#training", "#motivation"],
  beauty: ["#beauty", "#skincare", "#makeup", "#selfcare", "#glowup"],
  restaurant: ["#foodie", "#restaurant", "#delicious", "#chef", "#foodporn"],
  retail: ["#shopping", "#fashion", "#style", "#sale", "#newarrival"],
  "personal-brand": ["#personalbrand", "#growth", "#mindset", "#success", "#journey"],
  "real-estate": ["#realestate", "#property", "#home", "#investment", "#dreamhome"],
};

export async function generateCaptions(
  params: CaptionParams,
  platforms: Platform[],
): Promise<Record<Platform, CaptionVariants>> {
  // STUB — REPLACE IN PHASE 4 with: POST /api/tools/caption-generator
  await new Promise((r) => setTimeout(r, 1500));

  const result: Record<Platform, CaptionVariants> = {} as Record<Platform, CaptionVariants>;

  for (const platform of platforms) {
    const bodies = mockBodies[platform] || mockBodies.instagram;
    const tags = mockHashtags[params.businessType] || mockHashtags.general;

    const variants: CaptionOption[] = bodies.slice(0, 3).map((body, i) => {
      const hashtags = tags.slice(0, params.hashtagCount || 5);
      const fullText =
        params.emojiLevel === "heavy"
          ? `${body}\n\n${hashtags.join(" ")} ✨🎉🔥`
          : params.emojiLevel === "moderate"
            ? `${body}\n\n${hashtags.join(" ")}`
            : params.emojiLevel === "minimal"
              ? `${body.replace(/[^\w\s]/g, "")}\n\n${hashtags.join(" ")}`
              : `${body.replace(/[^\w\s]/g, "")}\n\n${hashtags.join(" ")}`;

      return {
        id: `cap-${platform}-${i}`,
        body: fullText,
        hashtags,
        totalChars: fullText.length,
      };
    });

    result[platform] = {
      variants,
      platform,
      charLimit: platformLimits[platform],
    };
  }

  return result;
}
