"use client";

import Image from "next/image";
import { avatarHue, avatarInitials } from "@/lib/avatarInitials";

type Props = {
  name: string;
  avatarUrl: string | null | undefined;
  size?: number;
};

function isRemote(src: string) {
  return src.startsWith("http://") || src.startsWith("https://");
}

/**
 * Apple-style circular avatar: photo when URL is set, otherwise gradient + initials.
 */
export function EmployeeAvatar({ name, avatarUrl, size = 56 }: Props) {
  const src = typeof avatarUrl === "string" && avatarUrl.trim() ? avatarUrl.trim() : null;
  const initials = avatarInitials(name);
  const hue = avatarHue(name);

  if (src) {
    if (isRemote(src)) {
      return (
        // eslint-disable-next-line @next/next/no-img-element -- admin may paste any CDN URL without configuring next/image domains
        <img
          src={src}
          alt=""
          width={size}
          height={size}
          className="employee-avatar"
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      );
    }
    return (
      <Image
        src={src}
        alt=""
        width={size}
        height={size}
        unoptimized={src.endsWith(".svg") || src.startsWith("data:")}
        className="employee-avatar"
        sizes={`${size}px`}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className="employee-avatar employee-avatar-fallback"
      style={{
        width: size,
        height: size,
        background: `linear-gradient(145deg, hsl(${hue}, 42%, 88%) 0%, hsl(${(hue + 40) % 360}, 48%, 72%) 100%)`,
      }}
      aria-hidden
    >
      <span className="employee-avatar-initials">{initials}</span>
    </div>
  );
}
