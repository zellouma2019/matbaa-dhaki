import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";
import { Toaster as SonnerToaster } from "sonner";

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "مطبعة الذكي — اطبع بسهولة، أسرع من واتساب",
  description:
    "خدمة طباعة احترافية وسريعة في الجزائر. اطبع مستنداتك وصورك وبطاقاتك أونلاين وتابع طلبك لحظة بلحظة. اطلب خلال دقيقة، جاهز خلال ساعة.",
  keywords: [
    "مطبعة",
    "طباعة",
    "طباعة مستندات",
    "طباعة صور",
    "تجليد",
    "مطبعة الجزائر",
    "مطبعة الذكي",
  ],
  authors: [{ name: "مطبعة الذكي" }],
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/apple-touch-icon.svg", type: "image/svg+xml" },
    ],
  },
  openGraph: {
    title: "مطبعة الذكي — اطبع بسهولة",
    description: "خدمة طباعة احترافية وسريعة في الجزائر",
    type: "website",
    siteName: "مطبعة الذكي",
  },
  manifest: "/manifest.webmanifest",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.svg" type="image/svg+xml" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta property="og:title" content="مطبعة الذكي — اطبع بسهولة" />
        <meta property="og:description" content="خدمة طباعة احترافية وسريعة في الجزائر" />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="مطبعة الذكي" />
      </head>
      <body
        className={`${cairo.variable} font-cairo antialiased bg-background text-foreground`}
      >
        {children}
        <SonnerToaster position="top-center" dir="rtl" richColors />
      </body>
    </html>
  );
}
