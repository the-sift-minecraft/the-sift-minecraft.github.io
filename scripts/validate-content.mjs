import { readFileSync, existsSync } from 'node:fs';
import assert from 'node:assert/strict';
import { launch, domain, forbidden, route } from './launch-spec.mjs';
const read = file => JSON.parse(readFileSync(file, 'utf8'));
const site = read('content/generated/site.json');
const home = read('content/generated/home.json');
const pages = read('content/generated/pages.json');
assert.equal(site.readyForLaunch, true, 'Launch must enable indexing');
assert.equal(site.hosting.siteUrl, domain, 'Production domain');
assert.equal(site.hosting.basePath, '', 'Root deployment requires empty basePath');
assert.equal(site.repositoryUrl, null, 'Repository identity must stay private');
assert.equal(site.siteName, 'The Sift Minecraft Guide');
assert.ok(!process.env.NEXT_PUBLIC_BASE_PATH, 'Build basePath must be empty');
assert.ok(!process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_SITE_URL === domain, 'Build domain must match production');
const all = [home, ...pages];
assert.equal(all.length, 8, 'Exactly eight launch pages');
assert.deepEqual(all.map(p => p.slug).sort(), launch.map(p => p[0]).sort());
assert.equal(new Set(all.map(p => p.title)).size, 8, 'Unique titles');
assert.equal(new Set(all.map(p => p.description)).size, 8, 'Unique descriptions');
for (const [slug, title, heading, description] of launch) {
  const p = all.find(p => p.slug === slug);
  assert.ok(p.enabled && p.navVisible, `${slug}: enabled navigation`);
  assert.equal(p.title, title, `${slug}: exact title`);
  assert.equal(p.description, description, `${slug}: exact description`);
  assert.equal(p.hero.heading, heading, `${slug}: exact H1`);
  assert.ok(p.title.length <= 60 && p.description.length <= 160, `${slug}: metadata length`);
  assert.equal(p.lastReviewed, '2026-10-02');
  assert.ok(p.hero.lead.length > 90 && p.sections.length > 3, `${slug}: useful answer and sections`);
  assert.ok(!forbidden.test(JSON.stringify(p)), `${slug}: prohibited public content`);
  assert.ok(!('searchIntent' in p || 'factsStatus' in p || 'priority' in p), `${slug}: editorial data only`);
  assert.equal(new Set(p.sections.map(s => s.id)).size, p.sections.length, `${slug}: unique section IDs`);
  for (const section of p.sections) {
    assert.ok(section.heading?.trim() && /^[a-z0-9-]+$/.test(section.id), `${slug}: section heading and ID`);
    for (const link of section.links ?? []) assert.ok(all.some(p => p.slug === link.slug), `${slug}: unknown link ${route(link.slug)}`);
    for (const source of section.sources ?? []) assert.equal(new URL(source.url).protocol, 'https:');
    for (const t of [section.table, ...(section.subsections ?? []).map(s => s.table)].filter(Boolean)) {
      assert.ok(t.caption && t.columns.length && t.rows.length, `${slug}: nonempty table`);
      assert.ok(t.rows.every(row => row.length === t.columns.length), `${slug}: table cell count`);
    }
  }
  for (const related of p.relatedSlugs ?? []) assert.ok(pages.some(p => p.slug === related), `${slug}: related route`);
}
for (const path of Object.values(site.assets)) assert.ok(existsSync(`public${path}`), `Asset exists: ${path}`);
assert.ok(!forbidden.test(JSON.stringify(site)), 'Clean public site config');
console.log('Content validation passed: 8 exact launch routes, metadata, sections, links and assets.');
