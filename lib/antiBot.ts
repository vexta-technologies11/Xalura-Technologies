// -----------------------------------------------------------------
// IMPORTANT: All anti-bot logic (hooks + types) is in antiBot.tsx
// because JSX is required. This .ts file exists only as a fallback
// for TypeScript resolvers that prefer .ts over .tsx.
// However, to avoid circular reference issues, this file should
// not be directly imported. Use "@/lib/antiBot" which resolves
// to antiBot.tsx on modern TypeScript configurations.
// -----------------------------------------------------------------
export type { PuzzleConfig, PuzzleType } from "./antiBot";

