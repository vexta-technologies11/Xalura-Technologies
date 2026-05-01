"use client";

import { useState } from "react";
import { SelectInput } from "@/components/shared/SelectInput";
import { Button } from "@/components/shared/Button";

export function PreferencesTab() {
  const [defaultLanguage, setDefaultLanguage] = useState("en");
  const [defaultTone, setDefaultTone] = useState("professional");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <SelectInput
        label="Default language"
        options={[
          { value: "en", label: "English" },
          { value: "es", label: "Spanish" },
          { value: "fr", label: "French" },
          { value: "de", label: "German" },
        ]}
        value={defaultLanguage}
        onChange={(e) => setDefaultLanguage(e.target.value)}
      />

      <SelectInput
        label="Default tone"
        options={[
          { value: "professional", label: "Professional" },
          { value: "friendly", label: "Friendly" },
          { value: "formal", label: "Formal" },
          { value: "casual", label: "Casual" },
        ]}
        value={defaultTone}
        onChange={(e) => setDefaultTone(e.target.value)}
      />

      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <label style={{ fontSize: "0.78rem", letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(200,220,255,0.75)" }}>
          Notifications
        </label>
        {["Email summaries", "Weekly usage report", "New features"].map((item) => (
          <label
            key={item}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "0.88rem",
              color: "rgba(200,210,230,0.7)",
              cursor: "pointer",
            }}
          >
            <input type="checkbox" defaultChecked style={{ accentColor: "#7c3aed" }} />
            {item}
          </label>
        ))}
      </div>

      <div style={{ marginTop: "8px" }}>
        <Button variant="primary">Save Preferences</Button>
      </div>
    </div>
  );
}
