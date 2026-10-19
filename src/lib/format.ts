// Даты показываем и вводим по московскому времени, независимо от пояса браузера.
const TIME_ZONE = 'Europe/Moscow';
const UTC_OFFSET = '+03:00';
const DAY_MS = 86_400_000;

const dayMonth = new Intl.DateTimeFormat('ru-RU', { timeZone: TIME_ZONE, day: 'numeric', month: 'long' });
const dayMonthWeekday = new Intl.DateTimeFormat('ru-RU', {
  timeZone: TIME_ZONE,
  day: 'numeric',
  month: 'long',
  weekday: 'long',
});
const monthShort = new Intl.DateTimeFormat('ru-RU', { timeZone: TIME_ZONE, month: 'short' });
const weekdayShort = new Intl.DateTimeFormat('ru-RU', { timeZone: TIME_ZONE, weekday: 'short' });
const dayNumber = new Intl.DateTimeFormat('ru-RU', { timeZone: TIME_ZONE, day: 'numeric' });
const time = new Intl.DateTimeFormat('ru-RU', { timeZone: TIME_ZONE, hour: '2-digit', minute: '2-digit' });
const isoLocal = new Intl.DateTimeFormat('sv-SE', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});
const money = new Intl.NumberFormat('ru-RU');

export const fmtTime = (iso: string) => time.format(new Date(iso));
export const fmtDayMonth = (iso: string) => dayMonth.format(new Date(iso));
export const fmtLongDay = (iso: string) => dayMonthWeekday.format(new Date(iso));

/** Плашка даты в карточке: 9 / окт / пт, 19:00 */
export function dateTile(iso: string) {
  const date = new Date(iso);
  return {
    day: dayNumber.format(date),
    month: monthShort.format(date).replace('.', ''),
    weekday: weekdayShort.format(date),
    time: time.format(date),
  };
}

/** «9 октября, 19:00–21:00» или «1 октября — 12 октября». */
export function fmtRange(startsAt: string | null, endsAt: string | null) {
  if (!startsAt) return 'Дата не указана';
  const start = new Date(startsAt);
  if (!endsAt) return `${dayMonth.format(start)}, ${time.format(start)}`;
  const end = new Date(endsAt);
  if (moscowDate(start) === moscowDate(end)) {
    return `${dayMonth.format(start)}, ${time.format(start)}–${time.format(end)}`;
  }
  return `${dayMonth.format(start)} — ${dayMonth.format(end)}`;
}

export function fmtPrice(price: number | null, { from = false } = {}) {
  if (price === null) return '—';
  if (price === 0) return 'Бесплатно';
  return `${from ? 'от ' : ''}${money.format(price)} ₽`;
}

/** YYYY-MM-DD по Москве */
export function moscowDate(date: Date) {
  return isoLocal.format(date).slice(0, 10);
}

/** ISO из API → значение для <input type="datetime-local"> по Москве. */
export function toLocalInput(iso: string | null) {
  return iso ? isoLocal.format(new Date(iso)).replace(' ', 'T') : '';
}

/** Значение <input type="datetime-local"> (московское время) → ISO с поясом. */
export function fromLocalInput(value: string) {
  return value ? `${value}:00${UTC_OFFSET}` : null;
}

export function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * DAY_MS);
}

/** Русская форма множественного числа: plural(5, 'событие', 'события', 'событий') → 'событий'. */
export function plural(n: number, one: string, few: string, many: string) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

type EventDates = { startsAt: string | null; endsAt: string | null };

export function isOngoing(event: EventDates, now: number) {
  if (!event.startsAt || !event.endsAt) return false;
  return new Date(event.startsAt).getTime() <= now && new Date(event.endsAt).getTime() >= now;
}

export function isPast(event: Pick<EventDates, 'endsAt'>, now: number) {
  return !!event.endsAt && new Date(event.endsAt).getTime() < now;
}
