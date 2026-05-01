export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface BusinessProfile {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  logoUrl: string | null;
  brandColor: string;
  taxLabel: string;
  defaultTaxRate: number;
  paymentDetails: string;
}

export interface ClientInfo {
  name: string;
  company: string;
  address: string;
  email: string;
}

export interface DiscountConfig {
  type: "percentage" | "fixed";
  value: number;
  applyBeforeTax: boolean;
}

export type BusinessLetterType = "quote" | "proposal" | "follow-up" | "thank-you" | "introduction" | "collection";

export interface LetterContext {
  type: BusinessLetterType;
  clientName: string;
  projectName: string;
  amount?: number;
  details: string;
}

export function calculateLineTotal(qty: number, price: number): number {
  return Math.round(qty * price * 100) / 100;
}

export function calculateSubtotal(items: LineItem[]): number {
  return items.reduce((sum, item) => sum + item.total, 0);
}

export function calculateTax(subtotal: number, rate: number): number {
  return Math.round(subtotal * (rate / 100) * 100) / 100;
}

export function calculateDiscount(
  subtotal: number,
  discount: DiscountConfig,
): number {
  if (discount.type === "percentage") {
    return Math.round(subtotal * (discount.value / 100) * 100) / 100;
  }
  return discount.value;
}

export function calculateGrandTotal(
  subtotal: number,
  taxAmount: number,
  discountAmount: number,
  discount: DiscountConfig,
): number {
  if (discount.applyBeforeTax) {
    const afterDiscount = subtotal - discountAmount;
    return afterDiscount + taxAmount;
  }
  return subtotal + taxAmount - discountAmount;
}

export async function generateBusinessLetter(
  type: BusinessLetterType,
  context: LetterContext,
): Promise<string> {
  const res = await fetch("/api/tools/business-letter", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ params: { ...context, type } }),
  });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || "Generation failed");
  const parsed = JSON.parse(json.text);
  return parsed.text;
}
