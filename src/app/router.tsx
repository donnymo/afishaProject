import { createBrowserRouter, type RouteObject } from 'react-router';
import { RequireRole } from '@/features/auth/require-role';
import { EventPage } from '@/pages/event-page';
import { EventsPage } from '@/pages/events-page';
import { RootLayout } from './root-layout';
import { NotFoundPage, PageFallback, RouteError } from './route-fallbacks';

/** Страница, код которой грузится отдельным чанком при первом переходе. */
const lazyPage = (load: () => Promise<RouteObject['Component']>): Pick<RouteObject, 'lazy' | 'HydrateFallback'> => ({
  lazy: async () => ({ Component: await load() }),
  HydrateFallback: PageFallback,
});

const editorPage = lazyPage(async () => (await import('@/pages/event-editor-page')).EventEditorPage);

export const router = createBrowserRouter([
  {
    Component: RootLayout,
    children: [
      {
        // Ошибки показываются внутри общего layout: шапка и навигация остаются на месте.
        ErrorBoundary: RouteError,
        children: [
          // Публичная афиша — основной сценарий, она входит в главный бандл.
          { index: true, Component: EventsPage },
          { path: 'events/:id', Component: EventPage },
          { path: 'login', ...lazyPage(async () => (await import('@/pages/login-page')).LoginPage) },
          { path: 'about', ...lazyPage(async () => (await import('@/pages/about-page')).AboutPage) },
          {
            element: <RequireRole role="organizer" />,
            children: [
              { path: 'my', ...lazyPage(async () => (await import('@/pages/my-events-page')).MyEventsPage) },
              // Оба адреса рендерят один компонент на том же месте дерева:
              // после создания черновика (new → :id/edit) форма не перемонтируется.
              { path: 'my/new', ...editorPage },
              { path: 'my/:id/edit', ...editorPage },
            ],
          },
          {
            element: <RequireRole role="moderator" />,
            children: [
              {
                path: 'moderation',
                ...lazyPage(async () => (await import('@/pages/moderation-page')).ModerationPage),
              },
            ],
          },
          { path: '*', Component: NotFoundPage },
        ],
      },
    ],
  },
]);
