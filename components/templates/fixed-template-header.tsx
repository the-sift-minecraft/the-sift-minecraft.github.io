"use client";

import { useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { siteConfig } from "@/config/site";
import type { InternalLink } from "@/config/types";
import { assetPath, routePath } from "@/lib/urls";

export function FixedTemplateHeader({ links }: { links: InternalLink[] }) {
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
  return <header className="launch-header" onKeyDown={event => {
    if (event.key === "Escape" && open) { setOpen(false); button.current?.focus(); }
  }}>
    <div className="wrap head">
      <Link className="brand" href="/" onClick={() => setOpen(false)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={assetPath(siteConfig.assets.logo)} alt="" width={28} height={28} />The Sift <span>Minecraft</span>
      </Link>
      <button ref={button} type="button" className="launch-menu" aria-label={open ? "Close navigation" : "Open navigation"} aria-controls="primary-navigation" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? <X size={22} /> : <Menu size={22} />}</button>
      <nav id="primary-navigation" aria-label="Primary navigation" className={`nav launch-nav${open ? " is-open" : ""}`}>
        {links.map(link => <Link key={link.slug} href={routePath(link.slug)} className="nav-link" aria-current={pathname === routePath(link.slug) ? "page" : undefined} onClick={() => setOpen(false)}>{link.label}</Link>)}
      </nav>
    </div>
  </header>;
}
