import type { CaptionParams, Platform } from "@/lib/services/captionService";

export function buildCaptionPrompt(params: CaptionParams, platforms: Platform[]): string {
  return `You are a social media caption writer. Generate captions for the given platforms.

CONTENT DESCRIPTION: ${params.contentDescription}
BUSINESS TYPE: ${params.businessType}
GOAL: ${params.goal}
TONES: ${params.tones.join(", ")}
HASHTAG COUNT: ${params.hashtagCount}
EMOJI LEVEL: ${params.emojiLevel} (none | minimal | moderate | heavy)
CTA: ${params.ctaType}
PLATFORMS: ${platforms.join(", ")}

Platform character limits: instagram=2200, facebook=63206, tiktok=2200, linkedin=3000, twitter=280, youtube=5000

Return valid JSON only:
{
  "[platform]": {
    "variants": [
      {"id": "cap-[platform]-0", "body": "string (full caption text)", "hashtags": ["#tag1", "#tag2"], "totalChars": number}
    ],
    "platform": "[platform]",
    "charLimit": number
  }
}
Generate 3 variant captions per platform, each with appropriate hashtags.}`;
}
