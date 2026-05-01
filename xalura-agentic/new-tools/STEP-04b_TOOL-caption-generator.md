# Tool 09 — Social Media Caption Generator
**Platform:** AI Toolkit | **Stack:** Cloudflare Workers + Pages | **Framework:** React + TypeScript

---

## 🎯 Purpose
Generate platform-optimized captions, hashtags, and hooks for Instagram, Facebook, TikTok, LinkedIn, X (Twitter), and YouTube. Designed for small business owners, content creators, restaurants, salons, influencers, and anyone managing social media.

---

## 🎨 Design Direction
**Aesthetic:** Electric social-native — rich black (#09090b), electric pink (#f72585), cyan (#4cc9f0), yellow pop (#ffd60a). Typography: `Familjen Grotesk` (display), `Plus Jakarta Sans` (body). Energetic, youthful, platform-native feel.

**Unforgettable Element:** Platform preview cards — generated captions display inside realistic mockups of each platform's post UI. Instagram shows a phone frame with post, LinkedIn shows a feed card, TikTok shows the caption overlay on a dark video background. Switch platforms to see captions reformat in the actual platform context.

**Layout:** Left = input + controls. Right = platform preview selector with real mockup frames showing the live caption output per platform.

---

## 🧱 Component Architecture

```
CaptionGenerator/
├── CaptionGenerator.tsx               # Root component
├── components/
│   ├── InputPanel/
│   │   ├── InputPanel.tsx             # Left input panel
│   │   ├── ContentDescriber.tsx       # What's the post about?
│   │   ├── BusinessTypeSelector.tsx   # Type of account/business
│   │   ├── GoalSelector.tsx           # Engagement / Awareness / Sales / Fun
│   │   ├── ToneChips.tsx              # Tone tag chips (multi-select)
│   │   ├── HashtagControl.tsx         # How many hashtags (0-30)
│   │   ├── EmojiToggle.tsx            # Include emojis on/off
│   │   ├── CTASelector.tsx            # Call-to-action type
│   │   └── GenerateButton.tsx         # CTA
│   ├── PlatformSelector/
│   │   ├── PlatformSelector.tsx       # Platform icon bar
│   │   ├── PlatformTab.tsx            # Individual platform tab
│   │   └── platforms.ts               # Platform config + char limits
│   ├── PreviewArea/
│   │   ├── PreviewArea.tsx            # Right panel — mockup previews
│   │   ├── InstagramPreview.tsx       # IG post mockup
│   │   ├── FacebookPreview.tsx        # FB post mockup
│   │   ├── TikTokPreview.tsx          # TikTok caption overlay mockup
│   │   ├── LinkedInPreview.tsx        # LinkedIn post card mockup
│   │   ├── TwitterPreview.tsx         # X/Twitter tweet mockup
│   │   └── YouTubePreview.tsx         # YouTube description preview
│   ├── CaptionOutput/
│   │   ├── CaptionOutput.tsx          # Caption text below preview
│   │   ├── CaptionText.tsx            # Editable caption text
│   │   ├── HashtagGroup.tsx           # Hashtags displayed as chips
│   │   ├── CharCounter.tsx            # Platform char limit indicator
│   │   ├── CharLimitBar.tsx           # Visual progress bar vs limit
│   │   └── VariantCarousel.tsx        # 3 caption variants to choose from
│   ├── BatchMode/
│   │   ├── BatchMode.tsx              # Generate for all platforms at once
│   │   ├── BatchOutput.tsx            # All platform captions listed
│   │   └── BatchCopy.tsx              # Copy all with platform labels
│   └── HashtagResearch/
│       ├── HashtagResearch.tsx        # Hashtag recommendations panel
│       ├── HashtagTier.tsx            # High/Medium/Niche tier groups
│       └── HashtagCopy.tsx            # Copy hashtag sets
└── hooks/
    ├── useCaptionGenerator.ts         # Core generation + state
    ├── usePlatformManager.ts          # Platform selection + config
    ├── useCharLimit.ts                # Char counting per platform
    └── useHashtagManager.ts           # Hashtag management
```

---

## ⚙️ Feature Specifications

### Platform Configurations
| Platform | Char Limit | Hashtag Style | Notes |
|---|---|---|---|
| **Instagram** | 2,200 chars | Up to 30, at end | Line breaks, emoji-friendly |
| **Facebook** | 63,206 chars | 3-5 max | Conversational, link-friendly |
| **TikTok** | 2,200 chars | 5-10, in caption | Short, hook-first |
| **LinkedIn** | 3,000 chars | 3-5, professional | No slang, value-focused |
| **X/Twitter** | 280 chars | 1-2 max | Ultra-concise, punchy |
| **YouTube** | 5,000 chars | In description | SEO-optimized, structured |

### Input Fields
| Field | Details |
|---|---|
| **Content Description** | What is the post about? (textarea, 300 char max) |
| **Business/Account Type** | Restaurant / Retail / Fitness / Beauty / Tech / Personal Brand / Real Estate / General |
| **Goal** | Engagement (likes/comments) / Brand Awareness / Drive Traffic / Sales/Promo / Entertainment |
| **Tone** | Multi-select chips: Funny / Inspiring / Educational / Promotional / Casual / Professional / Emotional |
| **Hashtag Count** | Slider: 0 / 5 / 10 / 15 / 20 / 30 |
| **Emoji Use** | Toggle: None / Minimal / Moderate / Heavy |
| **CTA Type** | None / Link in Bio / Comment Below / Follow Us / Share / Tag a Friend / Shop Now |

### Output Features
| Feature | Details |
|---|---|
| **3 Variants** | Generate 3 caption options per platform |
| **Platform Preview** | See caption in realistic platform UI mockup |
| **Batch Mode** | Generate for all 6 platforms simultaneously |
| **Inline Edit** | Edit caption directly in output area |
| **Char Limit Bar** | Visual bar shows usage vs platform limit |
| **Hashtag Chips** | Hashtags shown as removable chips |
| **Copy Modes** | Caption only / Hashtags only / Full (caption + hashtags) |
| **Hashtag Tiers** | High volume / Medium / Niche recommendations |

---

## 📦 State Management

```typescript
interface CaptionState {
  // Inputs
  contentDescription: string;
  businessType: BusinessType;
  goal: ContentGoal;
  tones: CaptionTone[];          // multi-select
  hashtagCount: number;
  emojiLevel: 'none' | 'minimal' | 'moderate' | 'heavy';
  ctaType: CTAType;

  // Platform
  activePlatform: Platform;
  selectedPlatforms: Platform[]; // for batch mode

  // Output
  captions: Record<Platform, CaptionVariants>;
  activeVariant: 0 | 1 | 2;
  editedCaption: string | null;

  // Batch
  batchMode: boolean;
  batchOutput: Record<Platform, string> | null;

  // UI
  isGenerating: boolean;
  isBatchGenerating: boolean;
  hashtagPanelOpen: boolean;
  error: string | null;
}

interface CaptionVariants {
  variants: CaptionOption[];
  activeVariant: number;
  platform: Platform;
  charCount: number;
  charLimit: number;
}

interface CaptionOption {
  id: string;
  body: string;
  hashtags: string[];
  emoji: string[];
  totalChars: number;
}

type Platform = 'instagram' | 'facebook' | 'tiktok' | 'linkedin' | 'twitter' | 'youtube';
```

---

## 🔌 API Integration Layer (Build Last)

```typescript
// /services/captionService.ts
// STUB during build — wire to Claude API in final phase

export async function generateCaptions(
  params: CaptionParams,
  platforms: Platform[]
): Promise<Record<Platform, CaptionVariants>> {
  // STUB: Return mock captions per platform
  // FINAL: POST /api/tools/caption-generator → Worker → Claude API
  // One API call returns all platform variants
  // System prompt includes platform-specific rules per target
}
```

**Worker Route:** `POST /api/tools/caption-generator`
**Rate Limit:** Per-generation count in KV (each platform batch = 1 credit)

---

## 🎬 Animations & Interactions

- **Platform switch:** Mockup frame morphs between platform UIs — phone frame for IG/TikTok, browser card for LinkedIn/Facebook
- **Caption generation:** Text types in word-by-word inside mockup, like composing in real-time
- **Variant switch:** Cards flip horizontally to show next variant
- **Hashtag chips:** Pop in one by one with scale animation after caption
- **Char limit bar:** Fills up with a smooth animation, turns orange at 80%, red at 95%
- **Batch mode toggle:** All 6 platform icons slide in as a row, each gets a loading spinner then checkmark
- **Copy success:** Specific platform mockup flashes briefly, confirm toast appears
- **Emoji toggle:** Emojis in preview appear/disappear with a playful pop animation
- **Tone chip select:** Selected chips scale up slightly with a border highlight

---

## 📐 Responsive Behavior
- **Desktop (>1050px):** Input left, platform tabs + mockup right
- **Tablet (600–1050px):** Input top, platform tabs + mockup below (scrollable)
- **Mobile (<600px):** Input → Generate → Platform swipe tabs → Caption output below each platform

---

## 🚫 Constraints & Rules
- Content description max: 300 characters
- No political, adult, or harmful content in generation
- Platform character limits enforced with hard cap warnings
- Hashtags generated are suggestions — not verified for actual reach data
- Batch mode limited to: 3 platforms on Starter, all 6 on Pro

---

## ✅ Definition of Done
- [ ] All 6 platform tabs switch and show correct mockup frames
- [ ] Input fields all functional with state
- [ ] Tone multi-select chips work correctly
- [ ] Mock captions render inside platform mockups
- [ ] 3 variant carousel works per platform
- [ ] Char limit bar updates and changes color correctly
- [ ] Hashtag chips display and are removable
- [ ] Batch mode shows all platforms simultaneously
- [ ] Copy functions work for all modes
- [ ] Responsive layout correct on all breakpoints
- [ ] API service stubbed and documented
