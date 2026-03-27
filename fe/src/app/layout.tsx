import type { Metadata } from 'next';
import { Inter, Geist, Source_Sans_3 } from 'next/font/google';
import './globals.css';
import Providers from './providers';
import { cn } from '@/lib/utils';

const sourceSans3 = Source_Sans_3({subsets:['latin'],variable:'--font-sans'});

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Restaurant Ordering',
  description: 'QR Code Ordering System',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" className={cn("font-sans", sourceSans3.variable)}>
      <head>
        <meta charSet="utf-8" />
        <meta content="width=device-width, initial-scale=1.0" name="viewport" />
        <title>Tổng quan Quản trị Savory</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&amp;display=swap"
          rel="stylesheet" />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap"
          rel="stylesheet" />
        <link rel="stylesheet" href="/logo.png" />
      </head>
      <body className={cn(inter.className, "bg-background font-display text-text-main antialiased selection:bg-savory-green selection:text-white")}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}