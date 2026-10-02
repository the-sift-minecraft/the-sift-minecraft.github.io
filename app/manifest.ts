import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";
import { themes } from "@/config/themes";
import { assetPath } from "@/lib/urls";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  const theme = themes[siteConfig.theme.preset] ?? themes["obsidian-red"];
  const background = siteConfig.theme.overrides?.background ?? theme?.tokens.background ?? "217 29% 9%";
  const primary = siteConfig.theme.overrides?.primary ?? theme?.tokens.primary ?? "217 91% 60%";
  return {
    name: siteConfig.siteName,
    short_name: siteConfig.shortName,
    description: siteConfig.description,
    start_url: assetPath("/"),
    display: "standalone",
    background_color: `hsl(${background})`,
    theme_color: `hsl(${primary})`,
    icons: [{ src: assetPath(siteConfig.assets.logo), type: "image/webp" }],
  };
}
