import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "UrbanCanopy AI — Microclimate Urban Planning Assistant",
  description:
    "Transform municipal climate briefs and budgets into parcel-level cooling blueprints. Powered by FortyGuard Temperature API and LangGraph AI.",
  keywords: [
    "urban heat island",
    "microclimate",
    "urban planning",
    "tree canopy",
    "shade structures",
    "FortyGuard",
    "temperature AI",
    "sustainability",
  ],
  openGraph: {
    title: "UrbanCanopy AI",
    description: "Autonomous microclimate urban-planning assistant",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=IBM+Plex+Serif:ital,wght@0,400;1,400&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://unpkg.com/maplibre-gl@5.6.0/dist/maplibre-gl.css"
          rel="stylesheet"
        />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
