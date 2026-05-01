"use client";

import { type ButtonHTMLAttributes, type ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  icon?: ReactNode;
  children: ReactNode;
}

const variantStyles: Record<string, string> = {
  primary:
    "bg-violet-600 hover:bg-violet-500 text-white border-violet-500/40 font-medium",
  secondary:
    "bg-[rgba(30,40,60,0.55)] hover:bg-[rgba(40,50,70,0.7)] text-[rgba(240,245,255,0.95)] border-[rgba(255,255,255,0.12)]",
  ghost:
    "bg-transparent hover:bg-[rgba(255,255,255,0.06)] text-[rgba(240,245,255,0.85)] border-transparent",
  danger:
    "bg-red-900/40 hover:bg-red-800/50 text-red-300 border-red-700/30",
};

const sizeStyles: Record<string, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2.5 text-sm",
  lg: "px-6 py-3 text-base",
};

export function Button({
  variant = "secondary",
  size = "md",
  isLoading = false,
  icon,
  children,
  disabled,
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button
      className={`ai-tools__btn ${variantStyles[variant]} ${sizeStyles[size]} inline-flex items-center justify-center gap-2 rounded-lg border transition-all duration-150 disabled:opacity-55 disabled:cursor-not-allowed ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="ai-tools__spin inline-block w-4 h-4 border-2 border-white/30 border-t-white/90 rounded-full" />
      ) : icon ? (
        icon
      ) : null}
      {children}
    </button>
  );
}
