"use client";

import { useState, useRef, type DragEvent } from "react";

interface ParsedFile {
  text: string;
  wordCount: number;
  fileType: string;
  fileName: string;
}

interface UploadZoneProps {
  acceptedTypes: string[];
  maxSizeMB: number;
  onFileParsed: (result: ParsedFile) => void;
  onError: (error: string) => void;
  label: string;
  sublabel: string;
  proRequired?: boolean;
  onUpgradeClick?: () => void;
}

export function UploadZone({
  acceptedTypes,
  maxSizeMB,
  onFileParsed,
  onError,
  label,
  sublabel,
  proRequired = false,
  onUpgradeClick,
}: UploadZoneProps) {
  const [state, setState] = useState<"idle" | "drag-over" | "loading" | "success" | "error">("idle");
  const [fileName, setFileName] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (proRequired) return;
    if (e.type === "dragenter" || e.type === "dragover") {
      setState("drag-over");
    } else {
      setState("idle");
    }
  };

  const handleFile = async (file: File) => {
    if (proRequired) {
      onUpgradeClick?.();
      return;
    }

    const ext = `.${file.name.split(".").pop()?.toLowerCase()}`;
    if (!acceptedTypes.includes(ext)) {
      setState("error");
      setErrorMsg(`Unsupported file type. Accepted: ${acceptedTypes.join(", ")}`);
      onError(`Unsupported file type: ${ext}`);
      return;
    }

    if (file.size > maxSizeMB * 1024 * 1024) {
      setState("error");
      setErrorMsg(`File too large. Max: ${maxSizeMB}MB`);
      onError(`File exceeds ${maxSizeMB}MB limit`);
      return;
    }

    setState("loading");
    setFileName(file.name);

    try {
      setState("success");
      const text = await file.text();
      onFileParsed({
        text,
        wordCount: text.split(/\s+/).filter(Boolean).length,
        fileType: ext.slice(1),
        fileName: file.name,
      });
      setTimeout(() => setState("idle"), 2000);
    } catch (err) {
      setState("error");
      setErrorMsg("Failed to read file");
      onError("File parsing failed");
    }
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    if (proRequired) return;
    setState("idle");
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleClick = () => {
    if (proRequired) {
      onUpgradeClick?.();
      return;
    }
    inputRef.current?.click();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const borderColor =
    state === "drag-over"
      ? "#7c3aed"
      : state === "error"
        ? "#ef4444"
        : state === "success"
          ? "#10b981"
          : "rgba(255,255,255,0.12)";

  return (
    <div
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      onClick={handleClick}
      style={{
        border: `2px dashed ${borderColor}`,
        borderRadius: "12px",
        padding: "32px 24px",
        textAlign: "center",
        cursor: proRequired ? "pointer" : "pointer",
        transition: "all 0.2s",
        background:
          state === "drag-over"
            ? "rgba(124,58,237,0.08)"
            : state === "error"
              ? "rgba(239,68,68,0.08)"
              : "rgba(0,0,0,0.2)",
        position: "relative",
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={acceptedTypes.join(",")}
        onChange={handleInputChange}
        style={{ display: "none" }}
      />

      {proRequired && (
        <div
          style={{
            position: "absolute",
            top: "8px",
            right: "8px",
            background: "linear-gradient(135deg, #c9a84c, #b8952a)",
            color: "#0a0a0f",
            fontSize: "0.65rem",
            fontWeight: 700,
            padding: "2px 8px",
            borderRadius: "4px",
            letterSpacing: "0.05em",
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          PRO
        </div>
      )}

      {state === "loading" ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
          <span className="ai-tools__spin" style={{ fontSize: "1.5rem" }}>
            ◈
          </span>
          <span style={{ color: "rgba(200,210,230,0.6)", fontSize: "0.88rem" }}>Reading {fileName}...</span>
        </div>
      ) : state === "success" ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "1.5rem" }}>•</span>
          <span style={{ color: "#10b981", fontSize: "0.88rem" }}>{fileName} ready</span>
        </div>
      ) : state === "error" ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "1.2rem" }}>!</span>
          <span style={{ color: "#ef4444", fontSize: "0.88rem" }}>{errorMsg}</span>
          <span style={{ color: "rgba(200,210,230,0.5)", fontSize: "0.78rem" }}>Click or tap to try again</span>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "1.8rem", opacity: proRequired ? 0.5 : 1 }}>
            {proRequired ? "◈" : "◈"}
          </span>
          <span
            style={{
              color: proRequired ? "rgba(200,210,230,0.5)" : "rgba(240,245,255,0.9)",
              fontSize: "0.95rem",
              fontWeight: 500,
            }}
          >
            {label}
          </span>
          <span
            style={{
              color: "rgba(200,210,230,0.45)",
              fontSize: "0.8rem",
            }}
          >
            {proRequired ? "Upgrade to upload files" : sublabel}
          </span>
        </div>
      )}
    </div>
  );
}
