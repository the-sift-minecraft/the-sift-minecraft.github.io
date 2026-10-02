import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import { launch, domain, route, forbidden, decode, plain, words } from './launch-spec.mjs';
const read = path => readFileSync(path, 'utf8');
const integrationConfig = JSON.parse(read('content/generated/integrations.json'));
const gaMeasurementId = (process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() || integrationConfig.gaMeasurementId || '').toUpperCase();
const site = JSON.parse(read('content/generated/site.json'));
assert.equal(site.readyForLaunch, true, 'Production audit requires launch indexing');
const pages = [JSON.parse(read('content/generated/home.json')), ...JSON.parse(read('content/generated/pages.json'))];
const expectedUrls = launch.map(([slug]) => domain + route(slug));
const sitemap = read('out/sitemap.xml');
const locs = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(m => decode(m[1]));
assert.deepEqual(locs.sort(), expectedUrls.sort(), 'Sitemap must contain exactly eight launch URLs');
const robots = read('out/robots.txt');
if (site.readyForLaunch) assert.ok(!/^Disallow:\s*\/\s*$/mi.test(robots) && /^Allow:\s*\/\s*$/mi.test(robots), 'Production crawling enabled');
else assert.ok(/^Disallow:\s*\/\s*$/mi.test(robots), 'Preflight output must remain non-indexable');
assert.ok(robots.includes(`${domain}/sitemap.xml`) && robots.includes(`Host: ${domain}`), 'Correct robots URLs');
const tags = (html, name) => [...html.matchAll(new RegExp(`<${name}\\b[^>]*>[\\s\\S]*?<\\/${name}>`, 'gi'))].map(m => m[0]);
const attrs = tag => Object.fromEntries([...tag.matchAll(/([\w-]+)="([^"]*)"/g)].map(m => [m[1], decode(m[2])]));
const meta = (html, name) => [...html.matchAll(/<meta\b[^>]*>/gi)].map(m => attrs(m[0])).find(a => a.name === name || a.property === name)?.content;
for (const [slug, title, h1, description] of launch) {
  const file = join('out', slug, 'index.html');
  assert.ok(existsSync(file), `Export exists: ${file}`);
  const html = read(file);
  assert.ok(!forbidden.test(html), `${slug}: clean HTML including embedded data`);
  assert.equal(plain(tags(html, 'title')[0] ?? ''), title, `${slug}: exact title`);
  assert.equal(meta(html, 'description'), description, `${slug}: exact description`);
  assert.equal(tags(html, 'h1').length, 1, `${slug}: one H1`);
  assert.equal(plain(tags(html, 'h1')[0]), h1);
  for (const heading of [...tags(html, 'h1'), ...tags(html, 'h2')]) assert.ok(plain(heading), `${slug}: nonempty heading`);
  const canonical = [...html.matchAll(/<link\b[^>]*>/gi)].map(m => attrs(m[0])).filter(a => a.rel === 'canonical');
  assert.equal(canonical.length, 1, `${slug}: one canonical`);
  assert.equal(canonical[0].href, domain + route(slug));
  assert.equal(meta(html, 'og:url'), domain + route(slug));
  assert.equal(meta(html, 'og:title'), title);
  assert.equal(meta(html, 'og:description'), description);
  assert.equal(meta(html, 'og:image'), `${domain}${site.assets.openGraph}`);
  assert.equal(meta(html, 'twitter:card'), 'summary_large_image');
  assert.ok(meta(html, 'robots')?.includes(site.readyForLaunch ? 'index, follow' : 'noindex, nofollow'), `${slug}: indexing state`);
  const main = tags(html, 'main')[0];
  assert.ok(main, `${slug}: visible main content`);
  const count = words(plain(main.replace(/<aside\b[^>]*>[\s\S]*?<\/aside>/g, '')));
  assert.ok(count >= (slug ? 800 : 1200), `${slug}: visible article too short (${count})`);
  const p = pages.find(p => p.slug === slug);
  for (const section of p.sections) {
    assert.ok(tags(main, 'h2').some(t => plain(t) === section.heading), `${slug}: rendered ${section.heading}`);
    for (const paragraph of section.paragraphs ?? []) assert.ok(plain(main).includes(paragraph), `${slug}: missing paragraph`);
    for (const s of section.subsections ?? []) {
      assert.ok(tags(main, 'h3').some(t => plain(t) === s.heading), `${slug}: rendered H3`);
      for (const text of [...s.paragraphs, ...(s.bullets ?? [])]) assert.ok(plain(main).includes(text), `${slug}: missing subsection text`);
    }
    for (const t of [section.table, ...(section.subsections ?? []).map(s => s.table)].filter(Boolean)) {
      assert.ok(tags(main, 'caption').some(c => plain(c) === t.caption), `${slug}: rendered table`);
      for (const cell of t.rows.flat()) assert.ok(plain(main).includes(cell), `${slug}: missing table cell`);
    }
    for (const bullet of section.bullets ?? []) assert.ok(plain(main).includes(bullet), `${slug}: rendered bullet`);
  }
  const nav = tags(html, 'nav').find(t => t.includes('id="primary-navigation"'));
  assert.ok(nav && html.includes('aria-controls="primary-navigation"') && html.includes('aria-expanded="false"'), `${slug}: accessible mobile navigation`);
  for (const [target] of launch.slice(1)) assert.ok(nav.includes(`href="${route(target)}"`), `${slug}: global route ${target}`);
  if (slug) assert.ok(main.includes('aria-label="Breadcrumb"') && main.includes('href="/"'), `${slug}: home breadcrumb`);
  const schemas = [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].flatMap(m => {
    const value = JSON.parse(m[1]); return Array.isArray(value) ? value : [value];
  });
  for (const type of slug ? ['WebPage','BreadcrumbList','FAQPage'] : ['WebSite','WebPage','FAQPage']) assert.ok(schemas.some(s => s['@type'] === type), `${slug}: ${type} schema`);
  assert.ok(!schemas.some(s => ['VideoGame','AggregateRating','Review','HowTo'].includes(s['@type'])), `${slug}: no inappropriate schema`);
  console.log(`${route(slug)}: ${count} visible words; exact metadata, sections, schema and navigation passed.`);
}
function walk(dir) { return readdirSync(dir, { withFileTypes:true }).flatMap(e => e.isDirectory() ? walk(join(dir,e.name)) : [join(dir,e.name)]); }
for (const file of walk('out').filter(f => /\.(html|txt|xml|webmanifest|svg)$/.test(f))) {
  const html = read(file);
  assert.ok(!forbidden.test(html), `${file}: clean public output`);
  if (!file.endsWith('.html')) continue;
  if (/^G-[A-Z0-9]+$/.test(gaMeasurementId)) {
    const head = tags(html, 'head')[0];
    assert.ok(head, `${file}: head exists for GA verification`);
    const loaders = tags(html, 'script').filter(tag => attrs(tag).src?.startsWith('https://www.googletagmanager.com/gtag/js'));
    assert.equal(loaders.length, 1, `${file}: exactly one Google tag loader`);
    assert.equal(attrs(loaders[0]).src, `https://www.googletagmanager.com/gtag/js?id=${gaMeasurementId}`, `${file}: configured measurement ID`);
    assert.ok(head.includes(loaders[0]), `${file}: Google tag loader is in head`);
    assert.ok(/\basync(?:[=\s>])/.test(loaders[0]), `${file}: asynchronous loader`);
    const configurations = tags(html, 'script').filter(tag => !/^<script[^>]*>self\.__next_f/.test(tag) && /gtag\(['"]config['"]/.test(tag));
    assert.equal(configurations.length, 1, `${file}: exactly one GA configuration`);
    assert.ok(head.includes(configurations[0]) && configurations[0].includes(`gtag('config', '${gaMeasurementId}')`), `${file}: GA configuration is in head`);
    assert.ok(head.startsWith(`<head>${loaders[0]}${configurations[0]}`), `${file}: Google tag immediately follows head`);
    assert.ok(configurations[0].includes('window.dataLayer = window.dataLayer || []') && configurations[0].includes("gtag('js', new Date())"), `${file}: complete Google tag initialization`);
  }

  for (const match of html.matchAll(/<(?:a|img|link|script)\b[^>]*>/gi)) {
    const a = attrs(match[0]); const target = a.href ?? a.src;
    if (!target) continue;
    let url; try { url = new URL(target, `${domain}/${file.slice(4)}`); } catch { assert.fail(`${file}: malformed URL`); }
    if (url.origin !== domain) continue;
    const path = decodeURIComponent(url.pathname);
    const dest = join('out', path, path.endsWith('/') ? 'index.html' : '');
    assert.ok(existsSync(dest), `${file}: broken internal URL ${target}`);
    if (url.hash && match[0].startsWith('<a')) assert.ok(read(dest).includes(`id="${decodeURIComponent(url.hash.slice(1))}"`), `${file}: missing anchor ${target}`);
  }
  if (/out\/(?:about|privacy|terms|copyright)\//.test(file)) assert.ok(meta(html,'robots')?.includes('noindex'), `${file}: legal noindex`);
}
assert.ok(!existsSync('out/wiki') && !existsSync('out/contact'), 'No demo or disabled contact route');
assert.ok(meta(read('out/404.html'),'robots')?.includes('noindex'), '404 noindex');
assert.ok(existsSync('out/.nojekyll'), 'GitHub Pages export marker');
const llms = read('out/llms.txt') + read('out/llms-full.txt');
for (const url of expectedUrls) assert.ok(llms.includes(url), `LLM discovery includes ${url}`);
assert.ok(!/\/(?:contact|privacy|terms|copyright|about)\//.test(llms), 'Discovery text excludes utility pages');
console.log(site.readyForLaunch ? 'Export SEO audit passed: production is crawlable.' : 'Export preflight passed: launch flag remains off pending final QA.');
