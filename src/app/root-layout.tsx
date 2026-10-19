import { Outlet, ScrollRestoration } from 'react-router';
import { SiteHeader } from '@/components/site-header';

export function RootLayout() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <SiteHeader />
      <Outlet />
      <ScrollRestoration />
    </div>
  );
}
