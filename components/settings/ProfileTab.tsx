"use client";

import { useState } from "react";
import { TextInput } from "@/components/shared/TextInput";
import { Button } from "@/components/shared/Button";

export function ProfileTab() {
  const [name, setName] = useState("John Doe");
  const [email, setEmail] = useState("john@example.com");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "16px",
          marginBottom: "8px",
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #7c3aed, #a855f7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "1.3rem",
            fontWeight: 700,
            color: "#fff",
          }}
        >
          JD
        </div>
        <div>
          <Button variant="ghost" size="sm">
            Change avatar
          </Button>
        </div>
      </div>

      <TextInput label="Full name" value={name} onChange={(e) => setName(e.target.value)} />
      <TextInput label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />

      <div style={{ marginTop: "8px" }}>
        <Button variant="primary">Save Changes</Button>
      </div>
    </div>
  );
}
