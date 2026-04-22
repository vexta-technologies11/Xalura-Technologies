/** Virtual module resolved in Cloudflare workerd (not in Node). */
declare module "cloudflare:workers" {
  export const env: Record<string, unknown>;
}
