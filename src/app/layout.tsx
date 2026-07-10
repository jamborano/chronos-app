import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const BASE_URL = process.env.VERCEL_URL 
  ? `https://${process.env.VERCEL_URL}` 
  : "https://chronos.my.id";

export const metadata: Metadata = {
  title: {
    default: "Chronos Pomodoro Timer – Fokus & Produktivitas Maksimal",
    template: "%s | Chronos Pomodoro Timer",
  },
  description:
    "Chronos Pomodoro Timer adalah aplikasi timer fokus berbasis teknik Pomodoro untuk meningkatkan produktivitas. Dilengkapi alarm premium, statistik harian, dan mode VIP bebas iklan. Cocok untuk work from home, studi, dan deep work. Mulai fokus sekarang!",
  keywords: [
    "pomodoro", "chronos", "timer", "fokus", "produktivitas",
    "pomodoro timer", "chronos timer", "timer pomodoro", "aplikasi pomodoro",
    "teknik pomodoro", "alarm pomodoro", "timer fokus", "pomodoro online",
    "chronos pomodoro timer app", "pomodoro timer online gratis",
    "aplikasi timer fokus produktivitas", "teknik pomodoro untuk work from home",
    "timer konsentrasi deep work", "pomodoro dengan alarm premium",
    "statistik harian pomodoro", "mode vip tanpa iklan pomodoro",
    "meningkatkan produktivitas dengan pomodoro",
  ],
  authors: [{ name: "Chronos Team", url: "https://jbtech.biz.id" }],
  creator: "Chronos Team",
  publisher: "Chronos Team",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    title: "Chronos Pomodoro Timer – Fokus & Produktivitas Maksimal",
    description:
      "Aplikasi timer Pomodoro terbaik untuk meningkatkan fokus dan produktivitas. Dilengkapi alarm premium, statistik harian, dan mode VIP bebas iklan.",
    url: BASE_URL,
    siteName: "Chronos Pomodoro Timer",
    images: [
      {
        url: `${BASE_URL}/og`,
        width: 1200,
        height: 630,
        alt: "Chronos Pomodoro Timer - Fokus & Produktivitas",
      },
    ],
    locale: "id_ID",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Chronos Pomodoro Timer – Fokus & Produktivitas Maksimal",
    description:
      "Aplikasi timer Pomodoro terbaik untuk meningkatkan fokus dan produktivitas. Alarm premium, statistik harian, mode VIP bebas iklan.",
    images: [`${BASE_URL}/og`],
    creator: "@chronos_app",
    site: "@chronos_app",
  },
  alternates: {
    canonical: BASE_URL,
  },
  category: "Productivity",
  applicationName: "Chronos Pomodoro Timer",
  generator: "Next.js",
  referrer: "origin-when-cross-origin",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 5,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        {/* 🔥 HANYA FAVICON.ICO – TIDAK PAKAI SVG */}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className={plusJakartaSans.className}>{children}</body>
    </html>
  );
}