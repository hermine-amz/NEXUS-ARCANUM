"use client";

import React from "react";
import { useApp } from "@/components/providers/AppProvider";

export function Logo({ light = true }: { light?: boolean }) {
  const { branding, locale } = useApp();
  const displayTagline =
    locale === "en" && branding.siteTagline === "SHOP • LIBRAIRIE NUMÉRIQUE"
      ? "SHOP • DIGITAL BOOKSTORE"
      : branding.siteTagline;

  return (
    <span className="inline-flex items-center gap-2.5 select-none">
      {branding.siteLogoUrl ? (
        <img
          src={branding.siteLogoUrl}
          alt={branding.siteName}
          className="w-9 h-9 rounded-xl object-cover border border-gold-500/40 bg-navy-950 shrink-0"
        />
      ) : (
        <svg
          width="36"
          height="36"
          viewBox="0 0 40 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
          className="shrink-0"
        >
          <rect
            x="1"
            y="1"
            width="38"
            height="38"
            rx="10"
            fill="#070C1B"
            stroke="#D4AF37"
            strokeWidth="1.5"
          />
          <path
            d="M11 13.5C14.5 12 18 12.5 20 14.5C22 12.5 25.5 12 29 13.5V27.5C25.5 26 22 26.5 20 28.5C18 26.5 14.5 26 11 27.5V13.5Z"
            stroke="#D4AF37"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path d="M20 14.5V28.5" stroke="#D4AF37" strokeWidth="1.5" />
          <circle cx="20" cy="9.5" r="1.6" fill="#D4AF37" />
        </svg>
      )}
      <span className="flex flex-col leading-none">
        <span
          className={`font-serif text-base sm:text-lg font-bold tracking-wide ${
            light ? "text-white" : "text-navy-950"
          }`}
        >
          {branding.siteName}
        </span>
        <span className="text-[10px] font-semibold tracking-[0.22em] text-gold-500 uppercase">
          {displayTagline}
        </span>
      </span>
    </span>
  );
}
