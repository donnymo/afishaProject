import { cn } from 'cn';
import { CompassIcon, TriangleAlertIcon } from 'lucide-react';
import { Link, useRouteError } from 'react-router';
import { EmptyState } from '@/components/empty-state';
import { PageContainer } from '@/components/page';
import { Button, buttonVariants } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

const homeLink = (
  <Link to="/" className={cn(buttonVariants({ variant: 'outline' }), 'h-10 px-4')}>
    На афишу
  </Link>
);

/** Пока загружается код страницы. */
export function PageFallback() {
  return (
    <PageContainer>
      <Skeleton className="h-9 w-64" />
      <Skeleton className="h-[480px] rounded-2xl" />
    </PageContainer>
  );
}

export function NotFoundPage() {
  return (
    <PageContainer>
      <EmptyState icon={CompassIcon} code="404 · NOT_FOUND" title="Страница не найдена" action={homeLink}>
        Проверьте адрес или вернитесь в афишу.
      </EmptyState>
    </PageContainer>
  );
}

/** Непойманная ошибка рендера или загрузки чанка: шапка остаётся, страница предлагает перезагрузку. */
export function RouteError() {
  const error = useRouteError();
  console.error(error);

  return (
    <PageContainer>
      <EmptyState
        icon={TriangleAlertIcon}
        title="Что-то пошло не так"
        action={
          <div className="flex gap-2">
            <Button className="h-10 px-4" onClick={() => window.location.reload()}>
              Обновить страницу
            </Button>
            {homeLink}
          </div>
        }
      >
        Возможно, вышла новая версия сайта. Обновите страницу или вернитесь в афишу.
      </EmptyState>
    </PageContainer>
  );
}
