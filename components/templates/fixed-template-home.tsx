import Link from "next/link";
import { ResponsiveBanner } from "@/components/integrations/responsive-banner";
import { Faq } from "@/components/site/faq";
import { JsonLd } from "@/components/site/json-ld";
import { PageSections } from "@/components/site/page-sections";
import { siteConfig } from "@/config/site";
import type { HomePageDefinition } from "@/config/types";
import { homeSchemas } from "@/lib/schema";
import { assetPath, routePath } from "@/lib/urls";

export function FixedTemplateHome({ home }: { home: HomePageDefinition }) {
  return <>
    <JsonLd data={homeSchemas(home)} />
    <main className="wrap launch-home">
      <section className="hero">
        <div className="launch-hero-grid"><div>
        <p className="eyebrow">Independent dimension guide · Reviewed October 2, 2026</p>
        <h1>{home.hero.heading}</h1>
        <p className="lead">{home.hero.lead}</p>
        <div className="launch-actions">
          <Link className="button-primary" href={routePath("release-date")}>When does The Sift release?</Link>
          <Link className="button-secondary" href={routePath("how-to-enter")}>How to enter The Sift</Link>
        </div>
        </div><figure className="launch-banner">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={assetPath(siteConfig.assets.cover)} alt="Minecraft Dungeons II promotional artwork for The Sift guide" width={1920} height={1080} fetchPriority="high" />
          <figcaption>Minecraft Dungeons II · The Sift is playable now</figcaption>
        </figure></div>
      </section>
      <ResponsiveBanner />
      {home.sections[0] ? <div className="launch-summary"><PageSections sections={[home.sections[0]]} nativeAdAfterFirstBlock /></div> : null}
      <div className="launch-body"><PageSections sections={home.sections.slice(1)} />
        <Faq items={home.faq} />
      </div>
    </main>
  </>;
}
