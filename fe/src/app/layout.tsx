import type { Metadata } from 'next';
import { Inter, Source_Sans_3, Playfair_Display } from 'next/font/google';
import './globals.css';
import Providers from './providers';
import { cn } from '@/lib/utils';
import { Toaster } from 'sonner';
import { ThemeToggleProvider } from '@/contexts/themeToggle.context';

const sourceSans3 = Source_Sans_3({ subsets: ['latin'], variable: '--font-sans' });
const inter = Inter({ subsets: ['latin'] });
const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-serif',
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
});

export const metadata: Metadata = {
  title: 'King Of Service — Nền tảng dọn dẹp',
  description: 'Kết nối khách hàng với đối tác dọn dẹp chuyên nghiệp.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="vi"
      className={cn("font-sans", sourceSans3.variable, playfair.variable)}
    >
      <head>
        <meta charSet="utf-8" />
        <meta content="width=device-width, initial-scale=1.0" name="viewport" />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        suppressHydrationWarning
        className={cn("bg-background text-foreground antialiased")}
      >
        <Toaster richColors={true} position="top-right" />
        <ThemeToggleProvider>
          <Providers>{children}</Providers>
        </ThemeToggleProvider>
      </body>
    </html>
  );
}
