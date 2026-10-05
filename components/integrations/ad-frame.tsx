"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { adsterra } from "@/config/adsterra";

type AdKind = "banner" | "native";

// A fresh document preserves parser-time scripts/document.write, isolates
// atOptions/provider globals, and disposes them on client-side navigation.
function AdFrameInstance({ kind }: { kind: AdKind }) {
  const slotRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const slot = slotRef.current;
    const host = hostRef.current;
    if (!slot || !host) return;

    let frame: HTMLIFrameElement | undefined;
    let mutations: MutationObserver | undefined;
    let contentResize: ResizeObserver | undefined;
    let expired = false;
    const banner = window.matchMedia("(min-width: 768px)").matches
      ? adsterra.desktop : adsterra.mobile;
    const width = kind === "banner" ? banner.width : undefined;
    const reservedHeight = kind === "banner" ? banner.height : 0;
    const code = kind === "banner" ? banner.code : adsterra.native.code;
    if (width) slot.style.setProperty("--ad-reserved-height", `${reservedHeight}px`);

    const collapse = () => {
      slot.dataset.adState = "empty";
      host.style.height = "0px";
    };

    const measure = () => {
      if (!frame || expired) return;
      const availableWidth = host.clientWidth;
      const scale = width ? Math.min(1, availableWidth / width) : 1;
      frame.style.width = `${width ?? availableWidth}px`;
      frame.style.transform = `scale(${scale})`;
      const doc = frame.contentDocument;
      if (!doc?.body) return;
      const creativeRoot = kind === "native"
        ? doc.getElementById(adsterra.native.containerId) : doc.body;
      if (!creativeRoot) return;
      // Scripts, blank containers, and tracking pixels do not establish fill.
      const filled = [...creativeRoot.querySelectorAll("iframe, img, a, video")].some((node) => {
        const rect = node.getBoundingClientRect();
        if (rect.width < 40 || rect.height < 20) return false;
        if (node.tagName === "IMG") {
          const img = node as HTMLImageElement;
          return img.complete && img.naturalWidth > 0;
        }
        if (node.tagName === "IFRAME") {
          const src = node.getAttribute("src");
          return !!node.getAttribute("srcdoc") || (!!src && src !== "about:blank");
        }
        return !!node.textContent?.trim() || !!node.querySelector("img, video");
      });
      if (!filled) {
        if (slot.dataset.adState === "filled") collapse();
        return;
      }
      const height = width ? reservedHeight : Math.ceil(Math.max(creativeRoot.getBoundingClientRect().height, creativeRoot.scrollHeight));
      frame.style.height = `${height}px`;
      host.style.height = `${Math.max(reservedHeight, height * scale)}px`;
      slot.dataset.adState = "filled";
    };

    // Strict Mode cancels its rehearsal before only the committed mount runs GET CODE.
    const start = window.setTimeout(() => {
      frame = document.createElement("iframe");
      frame.title = kind === "banner" ? "Advertisement banner" : "Advertisement native banner";
      frame.dataset.adFrame = kind;
      frame.style.height = `${reservedHeight}px`;
      frame.addEventListener("load", () => {
        if (expired) return;
        const doc = frame?.contentDocument;
        if (!doc?.body) { collapse(); return; }
        mutations = new MutationObserver(measure);
        mutations.observe(doc.body, { childList: true, subtree: true, attributes: true, characterData: true });
        contentResize = new ResizeObserver(measure);
        contentResize.observe(doc.body);
        const creativeRoot = doc.getElementById(adsterra.native.containerId);
        if (creativeRoot) contentResize.observe(creativeRoot);
        doc.addEventListener("load", measure, true);
        measure();
        if (slot.dataset.adState !== "filled") collapse();
      });
      frame.addEventListener("error", collapse);
      // Only hardcoded, trusted official GET CODE enters this document. No eval.
      frame.srcdoc = `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>html,body{margin:0;padding:0;background:transparent}body{overflow:hidden}</style></head><body>${code}</body></html>`;
      host.appendChild(frame);
      measure();
    }, 0);
    const timeout = window.setTimeout(() => {
      if (slot.dataset.adState === "filled") return;
      expired = true;
      mutations?.disconnect();
      contentResize?.disconnect();
      host.replaceChildren();
      collapse();
    }, 10000);
    const hostResize = new ResizeObserver(measure);
    hostResize.observe(host);

    return () => {
      expired = true;
      window.clearTimeout(start);
      window.clearTimeout(timeout);
      mutations?.disconnect();
      contentResize?.disconnect();
      hostResize.disconnect();
      host.replaceChildren();
    };
  }, [kind]);

  return (
    <div ref={slotRef} className={`ad-slot ad-slot-${kind}`} data-ad-slot={kind} data-ad-state="loading">
      <span className="ad-label">Advertisement</span>
      <div ref={hostRef} className="ad-host" />
    </div>
  );
}

export function AdFrame({ kind }: { kind: AdKind }) {
  const pathname = usePathname();
  return <AdFrameInstance key={`${pathname}:${kind}`} kind={kind} />;
}
