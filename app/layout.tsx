import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "White Stripes Madness",
  description: "V8 engines. Cold starts. Classic American iron.",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="sk">
      <head>
        <meta name="theme-color" content="#CC1800" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="WSM" />
        {/* iOS ikona — Safari ignoruje manifest.json, treba toto */}
        <link rel="apple-touch-icon" href="/icons/icon-512.png" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body style={{ margin: 0, padding: 0, background: "#080808" }}>
        {children}
      </body>
    </html>
  );
}
