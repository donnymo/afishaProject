import { useQuery } from '@tanstack/react-query';
import { cn } from 'cn';
import { Link, useLocation, useParams } from 'react-router';
import { ErrorAlert } from '@/components/error-alert';
import { PageContainer } from '@/components/page';
import { buttonVariants } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { eventQuery } from '@/features/events/api';
import { EventForm } from '@/features/events/components/event-form';
import { ApiError } from '@/lib/api';
import type { EventStatus } from '@/lib/types';

const NEW_FORM_KEY = 'new';

/** Статусы, в которых сервер отвечает на правку 409: показываем то же самое, не открывая форму. */
const LOCKED_STATUSES: Partial<Record<EventStatus, { code: string; message: string }>> = {
  hidden: { code: 'EVENT_HIDDEN', message: 'Скрытое модератором событие нельзя изменить' },
  archived: { code: 'EVENT_ARCHIVED', message: 'Событие завершилось и перенесено в архив, изменить его нельзя' },
};

/** /my/new и /my/:id/edit. */
export function EventEditorPage() {
  const { id } = useParams();
  const location = useLocation();
  const event = useQuery({ ...eventQuery(id ?? ''), enabled: !!id });

  // После создания черновика адрес меняется на /my/:id/edit. EventForm остаётся на том же месте
  // дерева с тем же ключом, поэтому её состояние и ошибка публикации переживают смену адреса.
  const justCreated = (location.state as { created?: boolean } | null)?.created === true;
  const formKey = justCreated || !id ? NEW_FORM_KEY : id;

  if (!id) {
    return (
      <PageContainer>
        <EventForm key={formKey} />
      </PageContainer>
    );
  }

  if (event.isError) {
    return (
      <PageContainer>
        <ErrorAlert
          error={event.error}
          title="Не удалось открыть событие"
          action={
            <Link to="/my" className={cn(buttonVariants({ variant: 'outline' }), 'h-9')}>
              К моим событиям
            </Link>
          }
        />
      </PageContainer>
    );
  }

  if (event.isPending) {
    return (
      <PageContainer>
        <Skeleton className="h-[600px] rounded-2xl" />
      </PageContainer>
    );
  }

  const locked = LOCKED_STATUSES[event.data.status];
  if (locked) {
    return (
      <PageContainer>
        <ErrorAlert
          error={new ApiError(409, locked.code, locked.message)}
          title="Редактирование недоступно"
          action={
            <Link to={`/events/${event.data.id}`} className={cn(buttonVariants({ variant: 'outline' }), 'h-9')}>
              Открыть карточку
            </Link>
          }
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <EventForm key={formKey} event={event.data} />
    </PageContainer>
  );
}
