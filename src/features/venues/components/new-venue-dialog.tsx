import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { ErrorAlert } from '@/components/error-alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import type { Venue } from '@/lib/types';
import { useCreateVenue } from '../api';

export function NewVenueDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (venue: Venue) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-5 p-6 sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Новая площадка</DialogTitle>
          <DialogDescription>
            Площадка попадёт в общий справочник и будет доступна другим организаторам.
          </DialogDescription>
        </DialogHeader>
        <NewVenueForm
          onCancel={() => onOpenChange(false)}
          onCreated={(venue) => {
            onCreated(venue);
            onOpenChange(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

function NewVenueForm({ onCancel, onCreated }: { onCancel: () => void; onCreated: (venue: Venue) => void }) {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const createVenue = useCreateVenue();
  const errors = createVenue.error?.fieldErrors() ?? {};
  const hasFieldErrors = Object.keys(errors).length > 0;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    createVenue.mutate(
      { name, address },
      {
        onSuccess: (venue) => {
          toast.success('Площадка добавлена', { description: venue.name });
          onCreated(venue);
        },
      },
    );
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
      {createVenue.error && !hasFieldErrors && <ErrorAlert error={createVenue.error} />}
      <Field data-invalid={!!errors.name}>
        <FieldLabel htmlFor="v-name">Название</FieldLabel>
        <Input
          id="v-name"
          className="h-11"
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-invalid={!!errors.name}
          placeholder="Клуб «Подвал»"
        />
        <FieldError className="text-[13px]">{errors.name}</FieldError>
      </Field>
      <Field data-invalid={!!errors.address}>
        <FieldLabel htmlFor="v-address">Адрес</FieldLabel>
        <Input
          id="v-address"
          className="h-11"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          aria-invalid={!!errors.address}
          placeholder="ул. Покровка, 3"
        />
        <FieldError className="text-[13px]">{errors.address}</FieldError>
      </Field>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" className="h-11 px-4" onClick={onCancel}>
          Отмена
        </Button>
        <Button type="submit" className="h-11 px-4" disabled={createVenue.isPending}>
          {createVenue.isPending ? 'Добавляем…' : 'Добавить'}
        </Button>
      </div>
    </form>
  );
}
