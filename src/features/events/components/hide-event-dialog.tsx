import { EyeOffIcon } from 'lucide-react';
import { useRef, useState, type RefObject } from 'react';
import { toast } from 'sonner';
import { ErrorAlert } from '@/components/error-alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Textarea } from '@/components/ui/textarea';
import type { EventItem } from '@/lib/types';
import { useHideEvent } from '../api';

const REASON_TEMPLATES = [
  'Недостоверная цена или дата',
  'Дубликат карточки',
  'Реклама, не связанная с событием',
  'Нарушение возрастного ограничения',
];
const MIN_REASON_LENGTH = 10;

/**
 * Скрытие с обязательной причиной: POST /events/:id/hide.
 * Родитель хранит event и после закрытия, чтобы содержимое не пропадало во время анимации.
 */
export function HideEventDialog({
  event,
  open,
  onOpenChange,
  onHidden,
}: {
  event: EventItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onHidden?: (updated: EventItem) => void;
}) {
  const reasonRef = useRef<HTMLTextAreaElement>(null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-5 p-6 sm:max-w-[520px]" initialFocus={reasonRef}>
        {event && (
          // Содержимое попапа монтируется при каждом открытии, поэтому форма всегда начинается с чистого листа.
          <HideEventForm
            event={event}
            reasonRef={reasonRef}
            onCancel={() => onOpenChange(false)}
            onHidden={(updated) => {
              onHidden?.(updated);
              onOpenChange(false);
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function HideEventForm({
  event,
  reasonRef,
  onCancel,
  onHidden,
}: {
  event: EventItem;
  reasonRef: RefObject<HTMLTextAreaElement | null>;
  onCancel: () => void;
  onHidden: (updated: EventItem) => void;
}) {
  const [reason, setReason] = useState('');
  const [touched, setTouched] = useState(false);
  const hide = useHideEvent();

  const tooShort = reason.trim().length < MIN_REASON_LENGTH;
  const showError = touched && tooShort;

  const submit = () => {
    setTouched(true);
    if (tooShort) return;
    hide.mutate(
      { id: event.id, reason: reason.trim() },
      {
        onSuccess: (updated) => {
          toast.success('Событие скрыто', { description: 'Организатор увидит причину в кабинете' });
          onHidden(updated);
        },
      },
    );
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-lg font-semibold">Скрыть событие?</DialogTitle>
        <DialogDescription>
          «{event.title}» пропадёт из афиши. {event.owner.name} увидит статус «Скрыто» и вашу причину.
        </DialogDescription>
      </DialogHeader>

      {hide.error && <ErrorAlert error={hide.error} />}

      <Field data-invalid={showError}>
        <FieldLabel htmlFor="hide-reason">Причина</FieldLabel>
        <div className="flex flex-wrap gap-1.5">
          {REASON_TEMPLATES.map((template) => (
            <button
              key={template}
              type="button"
              onClick={() => setReason(`${template}. `)}
              className="h-8 rounded-full border px-3 text-[13px] font-medium text-foreground hover:bg-muted"
            >
              {template}
            </button>
          ))}
        </div>
        <Textarea
          ref={reasonRef}
          id="hide-reason"
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          onBlur={() => setTouched(true)}
          placeholder="Что нарушено и что нужно исправить"
          aria-invalid={showError}
          aria-describedby="hide-reason-hint"
          className="min-h-24"
        />
        {showError ? (
          <FieldError id="hide-reason-hint" className="text-[13px]">
            Укажите причину: минимум {MIN_REASON_LENGTH} символов.
          </FieldError>
        ) : (
          <FieldDescription id="hide-reason-hint" className="text-[13px]">
            Обязательно, не короче {MIN_REASON_LENGTH} символов.
          </FieldDescription>
        )}
      </Field>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="outline" className="h-11 px-4" onClick={onCancel}>
          Отмена
        </Button>
        <Button
          className="h-11 bg-destructive px-4 text-white hover:bg-destructive/90"
          onClick={submit}
          disabled={hide.isPending}
        >
          <EyeOffIcon />
          {hide.isPending ? 'Скрываем…' : 'Скрыть событие'}
        </Button>
      </div>
    </>
  );
}
