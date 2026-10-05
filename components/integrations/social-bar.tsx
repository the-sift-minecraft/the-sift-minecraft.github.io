"use client";

import Script from "next/script";
import { adsterra } from "@/config/adsterra";

export function SocialBar() {
  return <Script id="adsterra-social-bar" src={adsterra.socialBarSrc} strategy="afterInteractive" />;
}
