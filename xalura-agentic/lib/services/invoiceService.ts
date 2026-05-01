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
  // STUB — REPLACE IN PHASE 4
  await new Promise((r) => setTimeout(r, 1500));

  const openings: Record<string, string> = {
    quote: `Thank you for the opportunity to provide a quote for ${context.projectName}.`,
    proposal: `We are pleased to submit this proposal for ${context.projectName}.`,
    "follow-up": `I hope this message finds you well. I wanted to follow up regarding ${context.projectName}.`,
    "thank-you": `I wanted to express my sincere gratitude for your partnership on ${context.projectName}.`,
    introduction: `I am writing to introduce myself and my company.`,
    collection: `This is a friendly reminder regarding the outstanding invoice for ${context.projectName}.`,
  };

  return `${openings[type] || openings.quote}\n\nDear ${context.clientName},\n\n${
    context.details
  }\n\n${
    context.amount
      ? `The total amount for this engagement is $${context.amount.toFixed(2)}.\n\n`
      : ""
  }Please don't hesitate to reach out if you have any questions.\n\nBest regards,\n[Your Name]`;
}
