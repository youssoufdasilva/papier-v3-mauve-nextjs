import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Papier V3",
    short_name: "Papier",
    description: "A document-first AI reading and writing prototype.",
    start_url: "/",
    display: "standalone",
    background_color: "#faf7fb",
    theme_color: "#3e3340",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  }
}
