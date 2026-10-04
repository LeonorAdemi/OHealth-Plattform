import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";

import "./globals.css";

// Archivo (SIL Open Font License) liegt im Repo, es wird nichts von Dritten geladen.
// Die Datei enthält Gewichts- und Breitenachse, siehe docs/DESIGN.md, Abschnitt 5.
const archivo = localFont({
  src: "./fonts/archivo-latin.woff2",
  variable: "--font-archivo",
  weight: "100 900",
  display: "swap",
  declarations: [{ prop: "font-stretch", value: "62% 125%" }],
});

export const metadata: Metadata = {
  title: { default: "OHealth", template: "%s · OHealth" },
  description: "Workouts tracken und in der Gruppe vergleichen.",
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="de" className={archivo.variable}>
      <body>{children}</body>
    </html>
  );
}
