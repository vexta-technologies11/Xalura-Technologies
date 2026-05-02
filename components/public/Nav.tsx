"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { Menu, X, Sun, Moon } from "lucide-react";
import { LogoMark } from "./LogoMark";
import { useTheme } from "@/components/shared/ThemeProvider";

const LINKS: { href: string; label: string }[] = [
  { href: "/team", label: "Team" },
  { href: "/#mission", label: "Mission" },
  { href: "/ai-tools", label: "Tools" },
  { href: "/news", label: "News" },
  { href: "/articles", label: "Articles" },
  { href: "/courses", label: "Courses" },
];

export function Nav({ variant = "default" }: { variant?: "default" | "palantir" }) {
  const ph = variant === "palantir";
  const [open, setOpen] = useState(false);
  const { theme, toggle } = useTheme();

  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [open]);

  const close = () => setOpen(false);

  return (
    <nav className={clsx("nav--rwd", ph && "nav--ph")}>
      <div className="nav-bar">
        <div className="nav-brand">
          <a className="logo logo--with-mark" href="/" onClick={close}>
            <LogoMark />
            <span className="logo-wordmark">Xalura Tech</span>
          </a>
        </div>
        <div className="nav-right nav-right--desktop">
          <ul className="nav-links" role="list">
            {LINKS.map((l) => (
              <li key={l.href + l.label}>
                <a href={l.href}>{l.label}</a>
              </li>
            ))}
          </ul>
          <button
            className="theme-toggle"
            onClick={toggle}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          >
            {theme === "dark" ? <Sun size={16} strokeWidth={1.5} /> : <Moon size={16} strokeWidth={1.5} />}
          </button>
          <a className="nav-pill" href="/#contact">
            Contact
          </a>
        </div>

        <button
          type="button"
          className="nav-burger"
          aria-expanded={open}
          aria-controls="nav-mobile-menu"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <X size={22} strokeWidth={1.5} /> : <Menu size={22} strokeWidth={1.5} />}
        </button>
      </div>

      {open ? (
        <>
          <div
            className="nav-scrim"
            onClick={close}
            onKeyDown={(e) => e.key === "Escape" && close()}
            aria-hidden
          />
          <div className="nav-mobile-panel" id="nav-mobile-menu" role="dialog" aria-modal="true">
            <ul className="nav-mobile-list" role="list">
              {LINKS.map((l) => (
                <li key={l.href + l.label}>
                  <a href={l.href} onClick={close}>
                    {l.label}
                  </a>
                </li>
              ))}
              <li>
                <button
                  className="nav-mobile-theme-toggle"
                  onClick={() => { toggle(); close(); }}
                  style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", fontSize: "inherit", padding: "12px 0", display: "flex", alignItems: "center", gap: "8px" }}
                >
                  {theme === "dark" ? <Sun size={18} strokeWidth={1.5} /> : <Moon size={18} strokeWidth={1.5} />}
                  {theme === "dark" ? "Light Mode" : "Dark Mode"}
                </button>
              </li>
              <li>
                <a href="/#contact" onClick={close}>
                  Contact
                </a>
              </li>
              <li>
                <a
                  href="/login"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={close}
                >
                  Login
                </a>
              </li>
            </ul>
          </div>
        </>
      ) : null}
    </nav>
  );
}

