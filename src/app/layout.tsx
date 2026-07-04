import "./globals.css";
import type { Metadata } from "next";
import Providers from "@/components/Providers";

export const metadata: Metadata = {
  title: "Slooze Eats — Food Ordering",
  description:
    "Food ordering app with role-based access control and country-based data isolation.",
};

// Set the theme before first paint to avoid a flash of the wrong theme.
const themeScript = `(function(){try{var t=localStorage.getItem('foa_theme')||'dark';document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme','dark');}})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
