import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SanctumWriter',
  description: 'Your private sanctuary for writing with local AI - powered by Ollama & LM Studio',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}

