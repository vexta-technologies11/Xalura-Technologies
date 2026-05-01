"use client";

import { useState, useCallback } from "react";
import { SplitPanel } from "@/components/shared/SplitPanel";
import { TextInput } from "@/components/shared/TextInput";
import { TextArea } from "@/components/shared/TextArea";
import { SelectInput } from "@/components/shared/SelectInput";
import { Button } from "@/components/shared/Button";
import { OutputSkeleton } from "@/components/shared/LoadingSkeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { OutputActions } from "@/components/shared/OutputActions";
import { UsageLimitBar } from "@/components/shared/UsageLimitBar";
import { UpgradeModal } from "@/components/shared/UpgradeModal";
import { useUsageLimit } from "@/lib/hooks/useUsageLimit";
import { useUpgradeModal } from "@/lib/hooks/useUpgradeModal";
import {
  calculateLineTotal,
  calculateSubtotal,
  calculateTax,
  calculateDiscount,
  calculateGrandTotal,
  generateBusinessLetter,
  type LineItem,
  type DiscountConfig,
  type BusinessLetterType,
} from "@/lib/services/invoiceService";

export function InvoiceGenerator() {
  const { usage, incrementUsage } = useUsageLimit("invoice");
  const { isOpen: upgradeOpen, triggerSource, openUpgrade, closeUpgrade } = useUpgradeModal();

  const [mode, setMode] = useState<"invoice" | "letter">("invoice");

  // Invoice fields
  const [businessName, setBusinessName] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  const [businessEmail, setBusinessEmail] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientCompany, setClientCompany] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("INV-001");
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
  );
  const [currency, setCurrency] = useState("USD");
  const [taxRate, setTaxRate] = useState(0);
  const [taxLabel, setTaxLabel] = useState("Tax");
  const [paymentNotes, setPaymentNotes] = useState("");

  const [lineItems, setLineItems] = useState<LineItem[]>([
    { id: "item-1", description: "", quantity: 1, unitPrice: 0, total: 0 },
  ]);

  const [discount, setDiscount] = useState<DiscountConfig>({
    type: "percentage",
    value: 0,
    applyBeforeTax: true,
  });

  // Letter fields
  const [letterType, setLetterType] = useState<BusinessLetterType>("quote");
  const [letterProjectName, setLetterProjectName] = useState("");
  const [letterDetails, setLetterDetails] = useState("");
  const [letterAmount, setLetterAmount] = useState(0);

  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedLetter, setGeneratedLetter] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const subtotal = calculateSubtotal(lineItems);
  const taxAmount = calculateTax(subtotal, taxRate);
  const discountAmount = calculateDiscount(subtotal, discount);
  const grandTotal = calculateGrandTotal(subtotal, taxAmount, discountAmount, discount);

  const addLineItem = () => {
    setLineItems((prev) => [
      ...prev,
      { id: `item-${Date.now()}`, description: "", quantity: 1, unitPrice: 0, total: 0 },
    ]);
  };

  const removeLineItem = (id: string) => {
    if (lineItems.length > 1) {
      setLineItems((prev) => prev.filter((item) => item.id !== id));
    }
  };

  const updateLineItem = (id: string, field: keyof LineItem, value: string | number) => {
    setLineItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value };
        if (field === "quantity" || field === "unitPrice") {
          updated.total = calculateLineTotal(
            field === "quantity" ? Number(value) : item.quantity,
            field === "unitPrice" ? Number(value) : item.unitPrice,
          );
        }
        return updated;
      }),
    );
  };

  const handleGenerateLetter = useCallback(async () => {
    if (usage.isBlocked) {
      openUpgrade("Invoice Generator");
      return;
    }
    setIsGenerating(true);
    setError(null);
    try {
      const result = await generateBusinessLetter(letterType, {
        type: letterType,
        clientName,
        projectName: letterProjectName,
        amount: letterAmount || undefined,
        details: letterDetails,
      });
      setGeneratedLetter(result);
      incrementUsage();
    } catch {
      setError("Failed to generate business letter.");
    } finally {
      setIsGenerating(false);
    }
  }, [letterType, clientName, letterProjectName, letterAmount, letterDetails, incrementUsage, usage.isBlocked, openUpgrade]);

  const currencySymbols: Record<string, string> = {
    USD: "$",
    EUR: "€",
    GBP: "£",
    CAD: "C$",
    AUD: "A$",
    MXN: "MX$",
  };

  const sym = currencySymbols[currency] || "$";

  return (
    <>
      <SplitPanel
        left={
          <div className="ai-tools__form">
            <UsageLimitBar used={usage.used} limit={usage.limit} label="Invoices today" cooldownMs={usage.cooldownMs} cooldownLabel={usage.cooldownLabel} />

            {/* Mode tabs */}
            <div style={{ display: "flex", gap: "4px", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: "8px", marginBottom: "12px" }}>
              <button
                className="ai-tools__btn ai-tools__btn--ghost"
                style={{
                  padding: "8px 16px",
                  fontSize: "0.85rem",
                  fontWeight: mode === "invoice" ? 600 : 400,
                  borderBottom: mode === "invoice" ? "2px solid #7c3aed" : "2px solid transparent",
                  borderRadius: 0,
                  background: "transparent",
                }}
                onClick={() => setMode("invoice")}
              >
                Invoice
              </button>
              <button
                className="ai-tools__btn ai-tools__btn--ghost"
                style={{
                  padding: "8px 16px",
                  fontSize: "0.85rem",
                  fontWeight: mode === "letter" ? 600 : 400,
                  borderBottom: mode === "letter" ? "2px solid #7c3aed" : "2px solid transparent",
                  borderRadius: 0,
                  background: "transparent",
                }}
                onClick={() => setMode("letter")}
              >
                Business Letter
              </button>
            </div>

            {mode === "invoice" ? (
              <>
                <div className="ai-tools__field-row">
                  <TextInput
                    label="Business name"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="Your Company Inc."
                  />
                  <TextInput
                    label="Invoice #"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    placeholder="INV-001"
                  />
                </div>

                <TextInput
                  label="Business address"
                  value={businessAddress}
                  onChange={(e) => setBusinessAddress(e.target.value)}
                  placeholder="123 Business St, City"
                />

                <div className="ai-tools__field-row">
                  <TextInput
                    label="Client name"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="John Doe"
                  />
                  <TextInput
                    label="Client company"
                    value={clientCompany}
                    onChange={(e) => setClientCompany(e.target.value)}
                    placeholder="Client Co. (optional)"
                  />
                </div>

                <TextInput
                  label="Client address"
                  value={clientAddress}
                  onChange={(e) => setClientAddress(e.target.value)}
                  placeholder="456 Client St, City"
                />

                <div className="ai-tools__field-row ai-tools__field-row--3">
                  <TextInput label="Issue date" type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
                  <TextInput label="Due date" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                  <SelectInput
                    label="Currency"
                    options={[
                      { value: "USD", label: "USD $" },
                      { value: "EUR", label: "EUR €" },
                      { value: "GBP", label: "GBP £" },
                      { value: "CAD", label: "CAD C$" },
                      { value: "AUD", label: "AUD A$" },
                    ]}
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                  />
                </div>

                {/* Line Items */}
                <div className="ai-tools__field">
                  <label className="ai-tools__label">Line items</label>
                  {lineItems.map((item, i) => (
                    <div
                      key={item.id}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "3fr 1fr 1.5fr 1.5fr auto",
                        gap: "6px",
                        marginBottom: "6px",
                        alignItems: "center",
                      }}
                    >
                      <input
                        className="ai-tools__input"
                        style={{ padding: "6px 8px", minHeight: "34px", fontSize: "0.82rem" }}
                        placeholder="Description"
                        value={item.description}
                        onChange={(e) => updateLineItem(item.id, "description", e.target.value)}
                      />
                      <input
                        className="ai-tools__input"
                        style={{ padding: "6px 8px", minHeight: "34px", fontSize: "0.82rem", textAlign: "right" }}
                        type="number"
                        min={0}
                        value={item.quantity}
                        onChange={(e) => updateLineItem(item.id, "quantity", Number(e.target.value))}
                      />
                      <input
                        className="ai-tools__input"
                        style={{ padding: "6px 8px", minHeight: "34px", fontSize: "0.82rem", textAlign: "right" }}
                        type="number"
                        min={0}
                        step={0.01}
                        value={item.unitPrice}
                        onChange={(e) => updateLineItem(item.id, "unitPrice", Number(e.target.value))}
                      />
                      <div
                        style={{
                          textAlign: "right",
                          fontSize: "0.88rem",
                          fontWeight: 600,
                          color: "rgba(240,245,255,0.9)",
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {sym}{item.total.toFixed(2)}
                      </div>
                      <button
                        className="ai-tools__btn ai-tools__btn--ghost"
                        style={{ padding: "4px 8px", fontSize: "0.8rem", color: "#ef4444" }}
                        onClick={() => removeLineItem(item.id)}
                    >
                        X
                    </button>
                    </div>
                  ))}
                  <Button variant="ghost" size="sm" onClick={addLineItem} style={{ marginTop: "4px" }}>
                    + Add item
                  </Button>
                </div>

                {/* Tax & Discount */}
                <div className="ai-tools__field-row ai-tools__field-row--3">
                  <div>
                    <TextInput
                      label="Tax rate (%)"
                      type="number"
                      min={0}
                      max={100}
                      step={0.1}
                      value={String(taxRate)}
                      onChange={(e) => setTaxRate(Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <TextInput
                      label="Tax label"
                      value={taxLabel}
                      onChange={(e) => setTaxLabel(e.target.value)}
                      placeholder="GST / VAT / Sales Tax"
                    />
                  </div>
                  <div>
                    <SelectInput
                      label="Discount type"
                      options={[
                        { value: "percentage", label: "Percentage (%)" },
                        { value: "fixed", label: "Fixed amount" },
                      ]}
                      value={discount.type}
                      onChange={(e) =>
                        setDiscount((prev) => ({ ...prev, type: e.target.value as "percentage" | "fixed" }))
                      }
                    />
                  </div>
                </div>

                <div className="ai-tools__field-row">
                  <TextInput
                    label="Discount value"
                    type="number"
                    min={0}
                    step={0.01}
                    value={String(discount.value)}
                    onChange={(e) => setDiscount((prev) => ({ ...prev, value: Number(e.target.value) }))}
                  />
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", paddingTop: "22px" }}>
                    <input
                      type="checkbox"
                      id="discount-before-tax"
                      checked={discount.applyBeforeTax}
                      onChange={(e) =>
                        setDiscount((prev) => ({ ...prev, applyBeforeTax: e.target.checked }))
                      }
                      style={{ accentColor: "#7c3aed" }}
                    />
                    <label htmlFor="discount-before-tax" style={{ fontSize: "0.82rem", color: "rgba(200,210,230,0.7)" }}>
                      Apply discount before tax
                    </label>
                  </div>
                </div>

                <TextArea
                  label="Payment notes"
                  placeholder="Payment terms, bank details, notes..."
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  rows={3}
                />
              </>
            ) : (
              <>
                <SelectInput
                  label="Letter type"
                  options={[
                    { value: "quote", label: "Quote / Estimate" },
                    { value: "proposal", label: "Project Proposal" },
                    { value: "follow-up", label: "Follow-Up" },
                    { value: "thank-you", label: "Thank You" },
                    { value: "introduction", label: "Introduction" },
                    { value: "collection", label: "Collection Notice" },
                  ]}
                  value={letterType}
                  onChange={(e) => setLetterType(e.target.value as BusinessLetterType)}
                />
                <TextInput
                  label="Client name"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Client name"
                />
                <TextInput
                  label="Project name"
                  value={letterProjectName}
                  onChange={(e) => setLetterProjectName(e.target.value)}
                  placeholder="Project / service"
                />
                <TextInput
                  label="Amount (optional)"
                  type="number"
                  min={0}
                  step={0.01}
                  value={String(letterAmount)}
                  onChange={(e) => setLetterAmount(Number(e.target.value))}
                />
                <TextArea
                  label="Details"
                  placeholder="Describe the proposal, quote, or context..."
                  value={letterDetails}
                  onChange={(e) => setLetterDetails(e.target.value)}
                  rows={6}
                />
                <div className="ai-tools__actions">
                  <Button
                    variant="primary"
                    size="lg"
                    isLoading={isGenerating}
                    disabled={!clientName || isGenerating}
                    onClick={handleGenerateLetter}
                  >
                    Generate Letter
                  </Button>
                  {error && <p className="ai-tools__err">{error}</p>}
                </div>
              </>
            )}
          </div>
        }
        right={
          <div className="ai-tools__out">
            {mode === "invoice" ? (
              <>
                {/* Invoice Preview */}
                <div
                  style={{
                    background: "#f6f7fb",
                    color: "#111822",
                    padding: "24px",
                    borderRadius: "4px",
                    boxShadow: "0 10px 40px rgba(0,0,0,0.2)",
                    fontSize: "0.88rem",
                    lineHeight: 1.6,
                    marginBottom: "16px",
                    maxWidth: "100%",
                    overflow: "hidden",
                  }}
                >
                  {/* Header */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: "24px",
                      borderBottom: "2px solid #1e293b",
                      paddingBottom: "16px",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "#0a1628" }}>
                        {businessName || "Your Business Name"}
                      </div>
                      <div style={{ fontSize: "0.8rem", color: "#5a6578" }}>
                        {businessAddress || "123 Business Street"}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "0.85rem", fontWeight: 700, textTransform: "uppercase", color: "#1e293b" }}>
                        Invoice
                      </div>
                      <div style={{ fontSize: "0.8rem", color: "#5a6578" }}>{invoiceNumber}</div>
                    </div>
                  </div>

                  {/* Client Info */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "16px",
                      marginBottom: "24px",
                      fontSize: "0.82rem",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: "0.65rem", textTransform: "uppercase", color: "#5a6578", marginBottom: "4px" }}>
                        Bill To
                      </div>
                      <div style={{ fontWeight: 600 }}>{clientName || "Client Name"}</div>
                      <div style={{ color: "#5a6578" }}>{clientCompany}</div>
                      <div style={{ color: "#5a6578" }}>{clientAddress}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div>Issue: {issueDate}</div>
                      <div>Due: {dueDate}</div>
                    </div>
                  </div>

                  {/* Items Table */}
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                    <thead>
                      <tr style={{ borderBottom: "2px solid #1e293b" }}>
                        <th style={{ textAlign: "left", padding: "6px 8px", fontWeight: 600, color: "#1e293b", fontSize: "0.72rem", textTransform: "uppercase" }}>
                          Description
                        </th>
                        <th style={{ textAlign: "center", padding: "6px 8px", fontWeight: 600, color: "#1e293b", fontSize: "0.72rem", textTransform: "uppercase" }}>
                          Qty
                        </th>
                        <th style={{ textAlign: "right", padding: "6px 8px", fontWeight: 600, color: "#1e293b", fontSize: "0.72rem", textTransform: "uppercase" }}>
                          Price
                        </th>
                        <th style={{ textAlign: "right", padding: "6px 8px", fontWeight: 600, color: "#1e293b", fontSize: "0.72rem", textTransform: "uppercase" }}>
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {lineItems.map((item) => (
                        <tr key={item.id} style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
                          <td style={{ padding: "8px" }}>{item.description || "—"}</td>
                          <td style={{ textAlign: "center", padding: "8px" }}>{item.quantity}</td>
                          <td style={{ textAlign: "right", padding: "8px" }}>
                            {sym}{item.unitPrice.toFixed(2)}
                          </td>
                          <td style={{ textAlign: "right", padding: "8px", fontWeight: 600 }}>
                            {sym}{item.total.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Totals */}
                  <div style={{ marginTop: "16px", marginLeft: "auto", maxWidth: "200px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", marginBottom: "4px" }}>
                      <span>Subtotal</span>
                      <span>{sym}{subtotal.toFixed(2)}</span>
                    </div>
                    {taxRate > 0 && (
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", marginBottom: "4px" }}>
                        <span>{taxLabel} ({taxRate}%)</span>
                        <span>{sym}{taxAmount.toFixed(2)}</span>
                      </div>
                    )}
                    {discount.value > 0 && (
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", marginBottom: "4px" }}>
                        <span>Discount ({discount.type === "percentage" ? `${discount.value}%` : `${sym}${discount.value}`})</span>
                        <span style={{ color: "#10b981" }}>-{sym}{discountAmount.toFixed(2)}</span>
                      </div>
                    )}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: "1rem",
                        fontWeight: 700,
                        borderTop: "2px solid #1e293b",
                        paddingTop: "8px",
                        marginTop: "8px",
                      }}
                    >
                      <span>Total</span>
                      <span style={{ color: "#10b981" }}>{sym}{grandTotal.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Payment notes */}
                  {paymentNotes && (
                    <div
                      style={{
                        marginTop: "24px",
                        paddingTop: "12px",
                        borderTop: "1px solid rgba(0,0,0,0.1)",
                        fontSize: "0.78rem",
                        color: "#5a6578",
                      }}
                    >
                      {paymentNotes}
                    </div>
                  )}
                </div>

                <OutputActions
                  onCopy={() => {
                    const text = `INVOICE ${invoiceNumber}\nBusiness: ${businessName}\nClient: ${clientName}\nTotal: ${sym}${grandTotal.toFixed(2)}`;
                    return text;
                  }}
                  showExport={false}
                />
              </>
            ) : isGenerating ? (
              <OutputSkeleton />
            ) : generatedLetter ? (
              <>
                <div className="ai-tools__out-header">
                  <h3 className="ai-tools__out-title">Business Letter</h3>
                </div>
                <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.7, fontSize: "0.95rem", color: "rgba(240,245,255,0.94)" }}>
                  {generatedLetter}
                </div>
                <div style={{ height: 12 }} />
                <OutputActions
                  onCopy={() => generatedLetter}
                  showExport={false}
                />
              </>
            ) : (
              <EmptyState
                icon="◈"
                title="Your invoice will appear here"
                description="Fill in the details and see your professional invoice rendered live."
              />
            )}
          </div>
        }
      />

      <UpgradeModal isOpen={upgradeOpen} onClose={closeUpgrade} triggerSource={triggerSource} />
    </>
  );
}
