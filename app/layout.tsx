import type { Metadata, Viewport } from "next";
import "@fontsource-variable/geist";
import "./globals.css";

export const metadata: Metadata = {
  title: "GrantRadar · Find funding for your school",
  description: "Find education grants, see how they fit your school, and keep your applications in one place. Free for schools.",
  icons: { icon: "/icon.svg" },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#243e4a" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><a className="skip-link" href="#main">Skip to main content</a>{children}</body></html>;
}
