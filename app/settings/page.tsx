"use client";

import { useState } from "react";
import { ProfileTab } from "@/components/settings/ProfileTab";
import { BillingTab } from "@/components/settings/BillingTab";
import { PreferencesTab } from "@/components/settings/PreferencesTab";

const TABS = [
  { id: "profile", label: "Profile" },
  { id: "billing", label: "Billing" },
  { id: "preferences", label: "Preferences" },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("profile");

  return (
    <section className="wrap" style={{ paddingTop: 48, paddingBottom: 80, maxWidth: 600 }}>
      <h1
        className="h1 r"
        style={{
          marginBottom: 4,
          fontSize: "clamp(1.5rem, 2.2vw, 1.85rem)",
        }}
      >
        Settings
      </h1>
      <p
        className="body-text"
        style={{ marginTop: 0, marginBottom: 24, opacity: 0.9 }}
      >
        Manage your account, billing, and preferences.
      </p>

      {/* Tab navigation */}
      <div
        style={{
          display: "flex",
          gap: "4px",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          paddingBottom: "8px",
          marginBottom: "24px",
        }}
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className="ai-tools__btn ai-tools__btn--ghost"
            style={{
              padding: "8px 20px",
              fontSize: "0.88rem",
              fontWeight: activeTab === tab.id ? 600 : 400,
              borderBottom: activeTab === tab.id ? "2px solid #7c3aed" : "2px solid transparent",
              borderRadius: 0,
              background: "transparent",
            }}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "profile" && <ProfileTab />}
      {activeTab === "billing" && <BillingTab />}
      {activeTab === "preferences" && <PreferencesTab />}
    </section>
  );
}
