"use client";

import { useEffect, useRef } from "react";

const VIDEO_SRC = "/brand/xalura-mark.mp4";
const POSTER_SRC = "/brand/xalura-mark-poster.png";

export function LogoMark() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      v.pause();
      v.removeAttribute("autoplay");
      return;
    }
    void v.play().catch(() => {
      /* Autoplay blocked or decode failed; poster stays visible */
    });
  }, []);

  return (
    <span className="logo-mark">
      <video
        ref={videoRef}
        className="logo-mark__video"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        poster={POSTER_SRC}
        width={72}
        height={72}
        aria-hidden
        disablePictureInPicture
        controls={false}
      >
        <source src={VIDEO_SRC} type="video/mp4" />
      </video>
    </span>
  );
}
