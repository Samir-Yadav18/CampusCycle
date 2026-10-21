import type { Metadata } from "next";
import "./globals.css";
import { RideProvider } from "@/context/RideContext";

export const metadata: Metadata = {
  title: "VeloCampus - Campus Bike Share & Smart Telemetry Platform",
  description: "Official Next.js web portal created from Google Stitch project 18433143651599993382. High-speed instant unlock, live campus telemetry, and subsidized green transit.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link 
          href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:ital,wght@0,300..900;1,300..900&family=Space+Grotesk:wght@300..700&display=swap" 
          rel="stylesheet" 
        />
      </head>
      <body className="min-h-screen bg-dock-bg text-slate-900 font-sans antialiased selection:bg-brand-accent selection:text-slate-950">
        <RideProvider>
          {children}
        </RideProvider>
      </body>
    </html>
  );
}
