import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

// configure sf pro display font
const sfPro = localFont({
  src: [
    {
      path: '../../public/fonts/sf-pro-display/SFPRODISPLAYREGULAR.woff2',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../../public/fonts/sf-pro-display/SFPRODISPLAYMEDIUM.woff2',
      weight: '500',
      style: 'normal',
    },
    {
      path: '../../public/fonts/sf-pro-display/SFPRODISPLAYBOLD.woff2',
      weight: '700',
      style: 'normal',
    },
  ],
  variable: "--font-sf-pro",
  display: 'swap',
});

export const metadata: Metadata = {
  title: "AI Tweet Analyzer",
  description: "analyze tweets with ai and save to spreadsheet",
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
    other: [
      { rel: 'android-chrome', url: '/android-chrome-192x192.png', sizes: '192x192' },
      { rel: 'android-chrome', url: '/android-chrome-512x512.png', sizes: '512x512' }
    ]
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="manifest" href="/site.webmanifest" />
      </head>
      <body
        className={`${sfPro.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
