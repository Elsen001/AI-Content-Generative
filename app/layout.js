import './globals.css';

export const metadata = {
  title: {
    default: 'VYRAL — AI şəkil və video studiyası',
    template: '%s · VYRAL',
  },
  description:
    '587 AI modeli bir hesabda. Şəkil, video, lip sync və motion control — paylaşımlı MuAPI balansı ilə.',
  openGraph: {
    title: 'VYRAL — AI şəkil və video studiyası',
    description: 'Xəyal et. Yarad. Viral ol. 587 model, bir studio.',
    type: 'website',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="az">
      <body>{children}</body>
    </html>
  );
}
