import type { Metadata } from "next";
import { Suspense } from "react";
import { AppProvider } from "@/components/provider";
import { Shell } from "@/components/shell";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "FridgeFork — Nuo šaldytuvo iki lėkštės", template: "%s | FridgeFork" },
  description:
    "Atrask receptus iš turimų produktų, išsaugok mėgstamiausius ir gamink kūrybiškiau su AI virtuvės asistentu.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="lt">
      <body>
        <Suspense fallback={<div className="initial-loading">Ruošiame tavo virtuvę…</div>}>
          <AppProvider>
            <Shell>{children}</Shell>
          </AppProvider>
        </Suspense>
      </body>
    </html>
  );
}
