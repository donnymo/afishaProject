import { useQuery } from '@tanstack/react-query';
import { cn } from 'cn';
import { ChevronRightIcon, PlusIcon, SendIcon } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';
import { toast } from 'sonner';
import { ErrorAlert } from '@/components/error-alert';
import { ToggleChip } from '@/components/toggle-chip';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { categoriesQuery } from '@/features/catalog/api';
import { venuesQuery } from '@/features/venues/api';
import { NewVenueDialog } from '@/features/venues/components/new-venue-dialog';
import { useNow } from '@/hooks/use-now';
import { fromLocalInput, isOngoing, isPast, toLocalInput } from '@/lib/format';
import { AGE_LIMITS, DEFAULT_CITY, type EventItem } from '@/lib/types';
import { usePublishEvent, useSaveEvent, type EventPayload } from '../api';
import { readinessChecks } from '../readiness';
import { ReadinessCard } from './readiness-card';
import { StatusBadge } from './status-badge';

/** Значения полей формы — строки, как их отдают <input>. */
interface FormValues {
  title: string;
  description: string;
  startsAt: string;
  endsAt: string;
  price: string;
  ageLimit: string;
  venueId: string;
  categoryIds: string[];
}

const EMPTY_FORM: FormValues = {
  title: '',
  description: '',
  startsAt: '',
  endsAt: '',
  price: '',
  ageLimit: '',
  venueId: '',
  categoryIds: [],
};

const toFormValues = (event: EventItem): FormValues => ({
  title: event.title,
  description: event.description ?? '',
  startsAt: toLocalInput(event.startsAt),
  endsAt: toLocalInput(event.endsAt),
  price: event.price === null ? '' : String(event.price),
  ageLimit: event.ageLimit === null ? '' : String(event.ageLimit),
  venueId: event.venue?.id ?? '',
  categoryIds: event.categories.map((category) => category.id),
});

const toPayload = (form: FormValues): EventPayload => ({
  title: form.title.trim(),
  description: form.description.trim() || null,
  startsAt: fromLocalInput(form.startsAt),
  endsAt: fromLocalInput(form.endsAt),
  price: form.price.trim() === '' ? null : Number(form.price),
  ageLimit: form.ageLimit === '' ? null : Number(form.ageLimit),
  city: DEFAULT_CITY,
  venueId: form.venueId || null,
  categoryIds: form.categoryIds,
});

const AGE_OPTIONS = AGE_LIMITS.map((age) => ({ value: String(age), label: `${age}+` }));

/**
 * Редактор черновика или опубликованного события.
 * Начальные значения берутся из `event` один раз при монтировании: родитель задаёт key,
 * чтобы при переходе к другому событию форма создавалась заново.
 */
export function EventForm({ event }: { event?: EventItem }) {
  const navigate = useNavigate();
  const now = useNow();
  const isNew = !event;
  const status = event?.status ?? 'draft';

  const venues = useQuery(venuesQuery);
  const categories = useQuery(categoriesQuery);
  const save = useSaveEvent(event?.id);
  const publish = usePublishEvent();

  const [form, setForm] = useState<FormValues>(() => (event ? toFormValues(event) : EMPTY_FORM));
  const [pendingAction, setPendingAction] = useState<'save' | 'publish' | null>(null);
  const [venueDialogOpen, setVenueDialogOpen] = useState(false);

  const error = publish.error ?? save.error;
  const fieldErrors = error?.fieldErrors() ?? {};
  const set = <K extends keyof FormValues>(key: K, value: FormValues[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const payload = toPayload(form);
  const checks = readinessChecks({ ...payload, status, categoryCount: payload.categoryIds.length }, now);

  const submit = async (andPublish: boolean) => {
    setPendingAction(andPublish ? 'publish' : 'save');
    save.reset();
    publish.reset();
    try {
      const saved = await save.mutateAsync(payload);
      // Черновик уже создан: дальше это обычное редактирование по его адресу.
      if (isNew) navigate(`/my/${saved.id}/edit`, { replace: true, state: { created: true } });
      if (!andPublish) {
        toast.success(saved.status === 'draft' ? 'Черновик сохранён' : 'Изменения сохранены');
        return;
      }
      await publish.mutateAsync(saved.id);
      toast.success('Опубликовано', { description: 'Карточка появилась в афише' });
      navigate(`/events/${saved.id}`);
    } catch {
      // Ошибку покажет ErrorAlert из состояния мутации.
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setPendingAction(null);
    }
  };

  const busy = pendingAction !== null;
  const actions =
    status === 'draft' ? (
      <>
        <Button variant="outline" className="h-11 px-4" onClick={() => submit(false)} disabled={busy}>
          {pendingAction === 'save' ? 'Сохраняем…' : 'Сохранить черновик'}
        </Button>
        <Button className="h-11 px-4" onClick={() => submit(true)} disabled={busy}>
          <SendIcon />
          {pendingAction === 'publish' ? 'Публикуем…' : 'Опубликовать'}
        </Button>
      </>
    ) : (
      <Button className="h-11 px-4" onClick={() => submit(false)} disabled={busy}>
        {busy ? 'Сохраняем…' : 'Сохранить изменения'}
      </Button>
    );

  const startHint =
    event && status === 'published' && isOngoing(event, now)
      ? 'Событие уже идёт: начало можно сдвинуть только вперёд.'
      : undefined;

  return (
    <>
      <nav aria-label="Навигация" className="flex min-w-0 items-center gap-1.5 text-[13px] text-muted-foreground">
        <Link to="/my" className="whitespace-nowrap hover:text-foreground">
          Мои события
        </Link>
        <ChevronRightIcon className="size-3.5 shrink-0" />
        <span className="truncate">{event?.title ?? 'Новое событие'}</span>
      </nav>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-2">
          <StatusBadge status={status} past={!!event && isPast(event, now)} className="self-start" />
          <h1 className="text-2xl leading-tight font-bold tracking-tight md:text-[30px]">
            {isNew ? 'Новое событие' : form.title || 'Без названия'}
          </h1>
          <p className="text-muted-foreground">
            {status === 'draft'
              ? 'Черновик видите только вы. Сохранять можно неполным.'
              : 'Изменения сразу видны в афише.'}
          </p>
        </div>
        <div className="hidden gap-2 md:flex">{actions}</div>
      </div>

      <div className="flex flex-col gap-6 md:flex-row md:items-start">
        <aside aria-label="Готовность к публикации" className="flex flex-col gap-4 md:order-2 md:w-[340px] md:shrink-0">
          <ReadinessCard checks={checks} />
          <section className="flex flex-col gap-3 rounded-2xl border bg-card p-5">
            <h2 className="text-[15px] font-semibold">Что будет после публикации</h2>
            <ol className="flex list-decimal flex-col gap-2 pl-4.5 text-foreground/80">
              <li>Карточка появится в афише и поиске.</li>
              <li>Править её можно и дальше, но после старта начало нельзя сдвинуть в прошлое.</li>
              <li>Модератор может скрыть карточку с указанием причины.</li>
            </ol>
          </section>
        </aside>

        <form
          className="flex min-w-0 flex-1 flex-col gap-6 rounded-2xl border bg-card px-4 py-5 md:p-7"
          onSubmit={(e) => {
            e.preventDefault();
            void submit(false);
          }}
          noValidate
        >
          {error && (
            <ErrorAlert
              error={error}
              title={error.code === 'EVENT_NOT_READY' ? 'Черновик пока нельзя опубликовать' : undefined}
            />
          )}

          <Section legend="Основное">
            <FormField id="ed-title" label="Название" error={fieldErrors.title}>
              <Input
                id="ed-title"
                className="h-11"
                value={form.title}
                onChange={(e) => set('title', e.target.value)}
                aria-invalid={!!fieldErrors.title}
                maxLength={200}
              />
            </FormField>
            <FormField id="ed-desc" label="Описание" error={fieldErrors.description}>
              <Textarea
                id="ed-desc"
                rows={5}
                className="min-h-28"
                placeholder="О чём событие, для кого и что нужно знать заранее"
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                aria-invalid={!!fieldErrors.description}
                maxLength={5000}
              />
            </FormField>
          </Section>

          <Separator />

          <Section legend="Когда и где">
            <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
              <FormField id="ed-start" label="Начало" error={fieldErrors.startsAt} hint={startHint}>
                <Input
                  id="ed-start"
                  type="datetime-local"
                  className="h-11"
                  value={form.startsAt}
                  onChange={(e) => set('startsAt', e.target.value)}
                  aria-invalid={!!fieldErrors.startsAt}
                />
              </FormField>
              <FormField id="ed-end" label="Окончание" error={fieldErrors.endsAt}>
                <Input
                  id="ed-end"
                  type="datetime-local"
                  className="h-11"
                  value={form.endsAt}
                  min={form.startsAt || undefined}
                  onChange={(e) => set('endsAt', e.target.value)}
                  aria-invalid={!!fieldErrors.endsAt}
                />
              </FormField>
              <FormField id="ed-venue" label="Площадка" error={fieldErrors.venueId}>
                <Select
                  items={(venues.data ?? []).map((venue) => ({ value: venue.id, label: venue.name }))}
                  value={form.venueId || null}
                  onValueChange={(value) => set('venueId', value ? String(value) : '')}
                >
                  <SelectTrigger id="ed-venue" className="h-11 w-full" aria-invalid={!!fieldErrors.venueId}>
                    <SelectValue placeholder="Выберите площадку" />
                  </SelectTrigger>
                  <SelectContent>
                    {venues.data?.map((venue) => (
                      <SelectItem key={venue.id} value={venue.id}>
                        {venue.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div>
                  <button
                    type="button"
                    onClick={() => setVenueDialogOpen(true)}
                    className="inline-flex items-center gap-1 text-[13px] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                  >
                    <PlusIcon className="size-3.5" />
                    Нет в списке? Добавить площадку
                  </button>
                </div>
              </FormField>
            </div>
          </Section>

          <Separator />

          <Section legend="Цена, возраст и категории">
            <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
              <FormField id="ed-price" label="Цена, ₽" error={fieldErrors.price}>
                <Input
                  id="ed-price"
                  inputMode="numeric"
                  className="h-11 tabular-nums"
                  placeholder="0 — бесплатно"
                  value={form.price}
                  onChange={(e) => set('price', e.target.value.replace(/\D/g, ''))}
                  aria-invalid={!!fieldErrors.price}
                />
              </FormField>
              <FormField id="ed-age" label="Возрастное ограничение" error={fieldErrors.ageLimit}>
                <Select
                  items={AGE_OPTIONS}
                  value={form.ageLimit || null}
                  onValueChange={(value) => set('ageLimit', value ? String(value) : '')}
                >
                  <SelectTrigger id="ed-age" className="h-11 w-full" aria-invalid={!!fieldErrors.ageLimit}>
                    <SelectValue placeholder="Не указано" />
                  </SelectTrigger>
                  <SelectContent>
                    {AGE_OPTIONS.map((age) => (
                      <SelectItem key={age.value} value={age.value}>
                        {age.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            </div>
            <FieldSet className="gap-2.5" data-invalid={!!fieldErrors.categoryIds}>
              <FieldLegend variant="label" className="mb-2.5">
                Категории
              </FieldLegend>
              <div className="flex flex-wrap gap-1.5">
                {categories.data?.map((category) => {
                  const selected = form.categoryIds.includes(category.id);
                  return (
                    <ToggleChip
                      key={category.id}
                      pressed={selected}
                      className="h-9 px-3.5"
                      onClick={() =>
                        set(
                          'categoryIds',
                          selected
                            ? form.categoryIds.filter((id) => id !== category.id)
                            : [...form.categoryIds, category.id],
                        )
                      }
                    >
                      {category.name}
                    </ToggleChip>
                  );
                })}
              </div>
              <FieldError className="text-[13px]">{fieldErrors.categoryIds}</FieldError>
            </FieldSet>
          </Section>

          <div className={cn('flex flex-col-reverse gap-2 md:hidden', '[&>*]:h-12')}>{actions}</div>
        </form>
      </div>

      <NewVenueDialog
        open={venueDialogOpen}
        onOpenChange={setVenueDialogOpen}
        onCreated={(venue) => set('venueId', venue.id)}
      />
    </>
  );
}

function Section({ legend, children }: { legend: string; children: ReactNode }) {
  return (
    <FieldSet>
      <FieldLegend className="mb-4 font-semibold">{legend}</FieldLegend>
      {children}
    </FieldSet>
  );
}

function FormField({
  id,
  label,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <Field className="min-w-0" data-invalid={!!error}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      {children}
      {error ? (
        <FieldError className="text-[13px]">{error}</FieldError>
      ) : (
        hint && <FieldDescription className="text-[13px]">{hint}</FieldDescription>
      )}
    </Field>
  );
}
