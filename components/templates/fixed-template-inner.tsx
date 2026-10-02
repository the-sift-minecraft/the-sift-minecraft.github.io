import Link from "next/link";
import { NativeAdSlot } from "@/components/integrations/native-ad-slot";
import { JsonLd } from "@/components/site/json-ld";
import { PageSections } from "@/components/site/page-sections";
import { Faq } from "@/components/site/faq";
import { siteConfig } from "@/config/site";
import type { SeoPageDefinition } from "@/config/types";
import { getRelatedPages } from "@/content/registry";
import { pageSchemas } from "@/lib/schema";
import { assetPath, routePath } from "@/lib/urls";

export function FixedTemplateInner({ page }: { page: SeoPageDefinition }) {
  const related = getRelatedPages(page);
  return <>
    <JsonLd data={pageSchemas(page)} />
    <main className="wrap main launch-inner">
      <aside className="sidebar box" aria-label="On this page">
        <h3>On this page</h3>
        {page.sections.map(section => <a key={section.id} href={`#${section.id}`}>{section.heading}</a>)}
        {page.faq?.length ? <a href="#faq">Frequently Asked Questions</a> : null}
      </aside>
      <article className="launch-article">
        <nav aria-label="Breadcrumb" className="site-breadcrumb"><Link href="/">Home</Link> <span aria-hidden="true">›</span> <span aria-current="page">{page.navLabel}</span></nav>
        <p className="eyebrow">Reviewed October 2, 2026</p>
        <h1>{page.hero.heading}</h1><p className="lead">{page.hero.lead}</p>
        {page.slug === "minecraft-dungeons-2" ? <figure className="launch-cover">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={assetPath(siteConfig.assets.cover)} alt="Minecraft Dungeons II promotional artwork" width={1200} height={675} />
          <figcaption>Minecraft Dungeons II promotional artwork. Game imagery belongs to Mojang Studios and Microsoft.</figcaption>
        </figure> : null}
        <PageSections sections={page.sections} />
        {page.faq?.length ? <Faq items={page.faq} /> : null}
        {related.length ? <section className="launch-related"><h2>Related Guides</h2><ul>{related.map(item => <li key={item.slug}><Link href={routePath(item.slug)}>{item.navLabel}</Link></li>)}</ul></section> : null}
        <NativeAdSlot />
      </article>
    </main>
  </>;
}
