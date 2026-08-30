import type { Metadata } from 'next';
import { Special_Elite, Oswald } from 'next/font/google';
import './globals.css';

const display = Oswald({ variable: '--font-display', subsets: ['latin'] });
const typewriter = Special_Elite({ variable: '--font-typewriter', weight: '400', subsets: ['latin'] });

export const metadata: Metadata = {
  metadataBase: new URL('https://moondesignstudio73-lgtm.github.io/juminjung/'),
  title: 'May I Have a Room? — JUJU HOTEL',
  description: '30일 동안 JUJU HOTEL을 지키고, 누구에게 문을 열지 결정하세요.',
  openGraph: {
    title: 'May I Have a Room? — JUJU HOTEL',
    description: '30일 동안 JUJU HOTEL을 지키고, 누구에게 문을 열지 결정하세요.',
    images: [{ url: '/juminjung/og.png', width: 1536, height: 1024, alt: '빗속의 JUJU HOTEL' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'May I Have a Room? — JUJU HOTEL',
    description: '30일 동안 JUJU HOTEL을 지키고, 누구에게 문을 열지 결정하세요.',
    images: ['/juminjung/og.png'],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ko"><body className={`${display.variable} ${typewriter.variable}`}>{children}</body></html>;
}
