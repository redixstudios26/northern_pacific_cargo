import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Northern Pacific Cargo | Operations',
  description: 'Regional cargo airline operations management for Northern Pacific Cargo.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
