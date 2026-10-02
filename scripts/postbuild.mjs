import { copyFileSync, existsSync, readFileSync, mkdirSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";

const root = process.cwd();
const output = join(root, "out");
const publicDir = join(root, "public");

writeFileSync(join(output, ".nojekyll"), "", "utf8");

const customDomain = process.env.NEXT_PUBLIC_CUSTOM_DOMAIN?.trim();
if (customDomain) writeFileSync(join(output, "CNAME"), `${customDomain}\n`, "utf8");

function walk(directory) {
  return readdirSync(directory).flatMap((name) => {
    const absolute = join(directory, name);
    return statSync(absolute).isDirectory() ? walk(absolute) : [absolute];
  });
}

/** Ensure technical verification files from public/ are present at the build output root. */
function ensureTechnicalPublicFiles() {
  if (!existsSync(publicDir) || !existsSync(output)) return [];
  const copied = [];
  for (const absolute of walk(publicDir)) {
    const local = relative(publicDir, absolute).split(sep).join("/");
    const base = local.split("/").pop() || "";
    const technical = /^google[a-z0-9_-]*\.html$/i.test(base)
      || /^(robots\.txt|ads\.txt)$/i.test(base)
      || local.startsWith(".well-known/");
    if (!technical) continue;
    const target = join(output, local);
    mkdirSync(dirname(target), { recursive: true });
    if (!existsSync(target)) {
      copyFileSync(absolute, target);
      copied.push(local);
    }
  }
  return copied;
}

const ensured = ensureTechnicalPublicFiles();
console.log(
  customDomain
    ? `Static output prepared with CNAME ${customDomain}.`
    : "Static output prepared for GitHub Pages.",
);
if (ensured.length) {
  console.log(`Ensured technical public files in out/: ${ensured.join(", ")}`);
}

/** Keep the Google tag at the start of each exported head for verification. */
for (const file of walk(output).filter(path => path.endsWith(".html"))) {
  const html = readFileSync(file, "utf8");
  const updated = html.replace(/<head>([\s\S]*?)<\/head>/, (head, contents) => {
    const tags = ["google-analytics-loader", "google-analytics"].map(id =>
      contents.match(new RegExp(`<script\\b[^>]*id="${id}"[^>]*>[\\s\\S]*?<\\/script>`))?.[0],
    );
    if (tags.every(tag => !tag)) return head;
    if (tags.some(tag => !tag)) throw new Error("Incomplete Google tag in exported head");
    for (const tag of tags) contents = contents.replace(tag, "");
    return `<head>${tags.join("")}${contents}</head>`;
  });
  if (updated !== html) writeFileSync(file, updated, "utf8");
}
