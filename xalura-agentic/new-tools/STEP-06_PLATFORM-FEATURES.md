# STEP 06 — Platform Features
> Feed this to Copilot after all 11 tools + PRO upload feature are complete.
> No new tool to build — this step wires the platform together.

---

## 1. Usage Limit System
- Every tool checks a mock `useUsageLimit(toolId)` hook before showing the generate button
- Hook returns: `{ used: number, limit: number, isBlocked: boolean }`
- Free tier limits: 5 uses/day per tool
- When `isBlocked`, the Generate button is replaced with an "Upgrade to Continue" button
- A `UsageLimitBar` component shows X/5 used with a colored progress bar

## 2. Upgrade Modal
- Global UpgradeModal component triggered by `useUpgradeModal()` hook
- Triggers when: free user hits usage limit, clicks locked PRO upload zone, opens Starter-only tool
- Shows 3 plan cards: Starter $12/mo, Pro $29/mo, Agency $79/mo
- CTA: "Upgrade Now" → links to /pricing

## 3. Pricing Page — route: /pricing
- 4 tier cards: Free / Starter $12 / Pro $29 / Agency $79
- Annual toggle (30% off)
- MOST POPULAR badge on Pro
- Full feature comparison table

## 4. Settings Page — route: /settings
- Tabs: Profile / Billing / Preferences
- Profile: name, email (read-only), avatar, Save button
- Billing: current plan badge, Manage Billing button
- Preferences: default language, default tone

## 5. Saved Outputs Page — route: /outputs
- Grid of saved output cards with tool icon, preview, date, Copy/Delete buttons
- Filter bar: All | [per tool]
- Empty state: "No saved outputs yet"
- Delete with confirmation
