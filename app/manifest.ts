import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Frigo Planner",
    short_name: "Frigo",
    description: "Stock du frigo, recettes et courses pour le foyer.",
    start_url: "/",
    display: "standalone",
    background_color: "#faf6f0",
    theme_color: "#c1602e",
    icons: [
      { src: "/icon-192", sizes: "192x192", type: "image/png" },
      { src: "/icon-512", sizes: "512x512", type: "image/png" },
    ],
  };
}
