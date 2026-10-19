import { ArrowDownIcon, ArrowRightIcon, CheckIcon, MinusIcon } from 'lucide-react';
import { Fragment } from 'react';
import { PageContainer, PageHeader } from '@/components/page';
import { StatusBadge } from '@/features/events/components/status-badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const FLOW = [
  { status: 'draft', title: 'Черновик', text: 'Можно сохранить неполным. Видит только владелец.' },
  { cmd: 'POST /events/:id/publish', who: 'владелец, все поля заполнены' },
  { status: 'published', title: 'Опубликовано', text: 'В афише, пока не закончилось. Владелец может править.' },
  { cmd: 'POST /events/:id/hide', who: 'модератор, причина обязательна' },
  { status: 'hidden', title: 'Скрыто', text: 'Публике отдаётся 404. Владелец видит причину.' },
] as const;

type Cell = boolean | string;
const MATRIX: [string, Cell, Cell, Cell][] = [
  ['Смотреть афишу и карточки', true, true, true],
  ['Создавать черновики', false, true, false],
  ['Видеть черновики', false, 'Только свои', false],
  ['Редактировать и публиковать', false, 'Только свои', false],
  ['Скрывать с причиной', false, false, true],
];

const ERRORS = [
  ['400', 'VALIDATION_FAILED', 'Неверные фильтры или даты, неизвестная сортировка, pageSize больше 50'],
  ['400', 'EVENT_NOT_READY', 'Публикация черновика с пустыми обязательными полями'],
  ['401', 'UNAUTHORIZED / TOKEN_EXPIRED', 'Нет токена, он неверен или просрочен'],
  ['403', 'FORBIDDEN_ROLE', 'Роль не подходит к действию'],
  ['403', 'FORBIDDEN_NOT_OWNER', 'Попытка изменить чужое событие'],
  ['404', 'EVENT_NOT_FOUND', 'Записи нет, или публике запрошен черновик / скрытая'],
  ['409', 'INVALID_STATE_TRANSITION', 'Повторная публикация, скрытие черновика'],
  ['409', 'EVENT_ALREADY_STARTED', 'Перенос начала идущего события в прошлое'],
  ['409', 'EVENT_ARCHIVED', 'Правка завершившегося события из архива'],
  ['429', 'TOO_MANY_REQUESTS', 'Слишком много попыток входа или регистрации'],
];

const SAMPLE = `{
  "code": "EVENT_NOT_READY",
  "message": "Черновик нельзя опубликовать: заполните обязательные поля",
  "details": [
    { "field": "venueId", "issue": "Не выбрана площадка" },
    { "field": "endsAt", "issue": "Не указано окончание" }
  ],
  "requestId": "6f1c9a2e-3b7d-4c55-9a51-0e2f7c1d8b44"
}`;

function MatrixCell({ value }: { value: Cell }) {
  if (value === true) return <CheckIcon className="mx-auto size-4 text-emerald-600" aria-label="да" />;
  if (value === false) return <MinusIcon className="mx-auto size-4 text-muted-foreground/60" aria-label="нет" />;
  return <span>{value}</span>;
}

export function AboutPage() {
  return (
    <PageContainer className="gap-7">
      <PageHeader
        title="Как устроено"
        description="Статусы события, права ролей и то, как интерфейс показывает ответы и ошибки API."
      />

      <section className="flex flex-col gap-4 rounded-2xl border p-4 md:p-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold">Жизненный цикл события</h2>
          <p className="text-muted-foreground">
            Статус меняется только отдельной командой. Обычное редактирование его не трогает.
          </p>
        </div>
        <div className="flex flex-col items-stretch md:flex-row">
          {FLOW.map((s, i) => (
            <Fragment key={i}>
              {'status' in s ? (
                <div className="flex flex-1 flex-col gap-1.5 rounded-xl border p-4">
                  <StatusBadge status={s.status} className="self-start font-mono" />
                  <span className="font-semibold">{s.title}</span>
                  <span className="text-[13px] text-muted-foreground">{s.text}</span>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-1 px-3.5 py-2 text-center">
                  <span className="font-mono text-xs text-foreground/80">{s.cmd}</span>
                  <ArrowRightIcon className="hidden size-5 text-muted-foreground md:block" />
                  <ArrowDownIcon className="size-5 text-muted-foreground md:hidden" />
                  <span className="text-xs text-muted-foreground">{s.who}</span>
                </div>
              )}
            </Fragment>
          ))}
        </div>
        <p className="flex flex-wrap items-center gap-2 text-[13px] text-muted-foreground">
          Когда опубликованное событие заканчивается, сервер сам переводит его в
          <StatusBadge status="archived" className="font-mono" />— из афиши оно пропадает, изменить его нельзя.
        </p>
      </section>

      <section className="flex flex-col gap-4 rounded-2xl border p-4 md:p-6">
        <h2 className="text-lg font-semibold">Кто что может</h2>
        <div className="overflow-x-auto rounded-xl border">
          <Table className="min-w-[520px]">
            <TableHeader>
              <TableRow>
                <TableHead className="h-11 pl-4">Действие</TableHead>
                <TableHead className="text-center">Гость</TableHead>
                <TableHead className="text-center">Организатор</TableHead>
                <TableHead className="text-center">Модератор</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {MATRIX.map(([action, ...cells]) => (
                <TableRow key={action}>
                  <TableCell className="py-3 pl-4">{action}</TableCell>
                  {cells.map((c, i) => (
                    <TableCell key={i} className="py-3 text-center">
                      <MatrixCell value={c} />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      <section className="flex flex-col gap-4 rounded-2xl border p-4 md:p-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold">Ответ API при ошибке</h2>
          <p className="text-muted-foreground">
            Любая ошибка приходит в одном формате. Полное описание маршрутов — в{' '}
            <a
              href="/api/docs"
              className="font-medium text-foreground underline underline-offset-4"
              target="_blank"
              rel="noreferrer"
            >
              OpenAPI
            </a>
            .
          </p>
        </div>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
          <div className="min-w-0 flex-[1.4] overflow-x-auto rounded-xl border">
            <Table className="min-w-[460px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="h-10 pl-3.5">HTTP</TableHead>
                  <TableHead>code</TableHead>
                  <TableHead>Когда</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ERRORS.map(([http, code, when]) => (
                  <TableRow key={code + http}>
                    <TableCell className="py-2.5 pl-3.5 font-mono text-[13px]">{http}</TableCell>
                    <TableCell className="py-2.5 font-mono text-[12.5px]">{code}</TableCell>
                    <TableCell className="py-2.5 whitespace-normal">{when}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <pre className="min-w-0 flex-1 overflow-x-auto rounded-xl bg-neutral-900 p-4 font-mono text-[12.5px] leading-relaxed text-neutral-200">
            {SAMPLE}
          </pre>
        </div>
      </section>
    </PageContainer>
  );
}
