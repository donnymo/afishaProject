import { HttpStatus, Injectable } from '@nestjs/common';
import type { AuthUser } from '../auth/auth-user.js';
import { CatalogService } from '../catalog/catalog.service.js';
import { AppException, ErrorCode, type ErrorDetail } from '../common/errors/app-exception.js';
import { skipTake, type Page } from '../common/pagination.js';
import { Prisma } from '../generated/prisma/client.js';
import { EventStatus, Role } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { VenuesService } from '../venues/venues.service.js';
import type {
  CreateEventDto,
  EventDto,
  HideEventDto,
  ListEventsQueryDto,
  ModerationCountsDto,
  ModerationQueryDto,
  MyEventCountsDto,
  MyEventsQueryDto,
  UpdateEventDto,
} from './events.dto.js';
import { PublicEventsCache } from './public-events-cache.js';
import { rangeIssues, readinessIssues } from './event-rules.js';
import { EVENT_INCLUDE, toEventDto, type EventWithRelations } from './event.mapper.js';
import { buildPublicEventsQuery, crossFieldIssues } from './public-query.js';

const notFound = () => new AppException(HttpStatus.NOT_FOUND, ErrorCode.EVENT_NOT_FOUND, 'Событие не найдено');
const conflict = (code: ErrorCode, message: string) => new AppException(HttpStatus.CONFLICT, code, message);
/** Статус сменили между чтением и записью: обычно это гонка с модератором. */
const statusChanged = () => conflict(ErrorCode.INVALID_STATE_TRANSITION, 'Статус события изменился, обновите карточку');
const toDate = (v: string | null) => (v === null ? null : new Date(v));

interface ListArgs {
  where: Prisma.EventWhereInput;
  orderBy: Prisma.EventOrderByWithRelationInput[];
  page: number;
  pageSize: number;
  withModeration: boolean;
}

/**
 * Вся логика владения и смены состояний живёт здесь, а не в контроллере.
 * Переходы статуса — только через publish() и hide(), а в архив переводит EventsArchiver;
 * update() статус не меняет.
 */
@Injectable()
export class EventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly catalog: CatalogService,
    private readonly venues: VenuesService,
    private readonly publicCache: PublicEventsCache,
  ) {}

  // ---------- Чтение ----------

  listPublic(q: ListEventsQueryDto): Promise<Page<EventDto>> {
    const key = JSON.stringify([
      q.from,
      q.to,
      q.category,
      q.city,
      q.minPrice,
      q.maxPrice,
      q.sort,
      q.order,
      q.page,
      q.pageSize,
    ]);
    return this.publicCache.getOrLoad(key, () => this.loadPublic(q));
  }

  private async loadPublic(q: ListEventsQueryDto): Promise<Page<EventDto>> {
    const issues = crossFieldIssues(q);
    let categoryIds: string[] | undefined;
    if (q.category?.length) {
      const { ids, missing } = await this.catalog.resolve('slug', q.category);
      if (missing.length) issues.push({ field: 'category', issue: `Неизвестные категории: ${missing.join(', ')}` });
      categoryIds = ids;
    }
    if (issues.length) throw AppException.validation('Некорректные параметры фильтра', issues);

    const { where, orderBy } = buildPublicEventsQuery(q, categoryIds, new Date());
    return this.list({ where, orderBy, page: q.page, pageSize: q.pageSize, withModeration: false });
  }

  /**
   * Публике — только актуальные опубликованные события. Черновик и скрытая
   * карточка для посторонних неотличимы от несуществующей записи (404).
   */
  async getForViewer(id: string, viewer?: AuthUser): Promise<EventDto> {
    const e = await this.prisma.event.findUnique({ where: { id }, include: EVENT_INCLUDE });
    if (!e) throw notFound();
    const privileged = viewer?.role === Role.moderator || viewer?.id === e.ownerId;
    const publiclyVisible = e.status === EventStatus.published && e.endsAt !== null && e.endsAt >= new Date();
    if (!privileged && !publiclyVisible) throw notFound();
    return toEventDto(e, privileged);
  }

  listMine(user: AuthUser, q: MyEventsQueryDto): Promise<Page<EventDto>> {
    return this.list({
      where: { ownerId: user.id, ...(q.status && { status: q.status }) },
      orderBy: [{ startsAt: { sort: 'desc', nulls: 'first' } }, { id: 'asc' }],
      page: q.page,
      pageSize: q.pageSize,
      withModeration: true,
    });
  }

  listForModeration(q: ModerationQueryDto): Promise<Page<EventDto>> {
    return this.list({
      where: { status: q.status },
      orderBy:
        q.status === EventStatus.hidden ? [{ hiddenAt: 'desc' }, { id: 'asc' }] : [{ startsAt: 'asc' }, { id: 'asc' }],
      page: q.page,
      pageSize: q.pageSize,
      withModeration: true,
    });
  }

  /** Счётчики для вкладок одним GROUP BY вместо отдельного COUNT на каждую вкладку. */
  async countMine(user: AuthUser): Promise<MyEventCountsDto> {
    const counts = await this.countByStatus({ ownerId: user.id });
    const { draft, published, hidden, archived } = counts;
    return { all: draft + published + hidden + archived, draft, published, hidden, archived };
  }

  async countForModeration(): Promise<ModerationCountsDto> {
    const { published, hidden } = await this.countByStatus({
      status: { in: [EventStatus.published, EventStatus.hidden] },
    });
    return { published, hidden };
  }

  // ---------- Изменение карточки ----------

  async create(user: AuthUser, dto: CreateEventDto): Promise<EventDto> {
    const startsAt = toDate(dto.startsAt ?? null);
    const endsAt = toDate(dto.endsAt ?? null);
    const categoryIds = await this.checkReferences(dto.venueId, dto.categoryIds, rangeIssues(startsAt, endsAt));

    const e = await this.prisma.event.create({
      data: {
        title: dto.title,
        description: dto.description ?? null,
        startsAt,
        endsAt,
        price: dto.price ?? null,
        ageLimit: dto.ageLimit ?? null,
        city: dto.city ?? 'moscow',
        status: EventStatus.draft,
        owner: { connect: { id: user.id } },
        ...(dto.venueId && { venue: { connect: { id: dto.venueId } } }),
        ...(categoryIds && { categories: { connect: categoryIds.map((id) => ({ id })) } }),
      },
      include: EVENT_INCLUDE,
    });
    return toEventDto(e, true);
  }

  async update(user: AuthUser, id: string, dto: UpdateEventDto): Promise<EventDto> {
    const e = await this.loadOwned(user, id);
    if (e.status === EventStatus.hidden) {
      throw conflict(ErrorCode.EVENT_HIDDEN, 'Скрытое модератором событие нельзя изменить');
    }
    if (e.status === EventStatus.archived) {
      throw conflict(ErrorCode.EVENT_ARCHIVED, 'Событие завершилось и перенесено в архив, изменить его нельзя');
    }

    const now = new Date();
    const startsAt = dto.startsAt === undefined ? e.startsAt : toDate(dto.startsAt);
    const endsAt = dto.endsAt === undefined ? e.endsAt : toDate(dto.endsAt);
    const startChanged = dto.startsAt !== undefined && startsAt?.getTime() !== e.startsAt?.getTime();

    // После начала события его нельзя перенести в прошлое; опубликованное — нельзя и «задним числом».
    if (startChanged && e.status === EventStatus.published && startsAt && startsAt < now) {
      const started = e.startsAt !== null && e.startsAt <= now;
      if (started) {
        throw new AppException(
          HttpStatus.CONFLICT,
          ErrorCode.EVENT_ALREADY_STARTED,
          'Событие уже началось: начало нельзя перенести в прошлое',
          [{ field: 'startsAt', issue: `Новое начало должно быть не раньше ${now.toISOString()}` }],
        );
      }
      throw AppException.validation('Начало опубликованного события не может быть в прошлом', [
        { field: 'startsAt', issue: 'Дата уже прошла' },
      ]);
    }

    const venueId = dto.venueId === undefined ? e.venueId : dto.venueId;
    const categoryIds = await this.checkReferences(
      dto.venueId ?? undefined,
      dto.categoryIds,
      rangeIssues(startsAt, endsAt),
    );

    if (e.status === EventStatus.published) {
      const issues = readinessIssues(
        {
          title: dto.title ?? e.title,
          description: dto.description === undefined ? e.description : dto.description,
          startsAt,
          endsAt,
          price: dto.price === undefined ? e.price : dto.price,
          ageLimit: dto.ageLimit === undefined ? e.ageLimit : dto.ageLimit,
          city: dto.city ?? e.city,
          venueId,
          venueExists: true, // ссылки уже проверены в checkReferences
          categoryCount: categoryIds ? categoryIds.length : e.categories.length,
        },
        now,
        { requireFutureStart: false },
      );
      if (issues.length)
        throw AppException.validation('Опубликованное событие должно оставаться полностью заполненным', issues);
    }

    try {
      const updated = await this.prisma.event.update({
        // Условие по статусу защищает от гонки с модератором: если карточку успели скрыть, получим P2025.
        where: { id, status: e.status },
        data: {
          title: dto.title,
          description: dto.description,
          startsAt: dto.startsAt === undefined ? undefined : startsAt,
          endsAt: dto.endsAt === undefined ? undefined : endsAt,
          price: dto.price,
          ageLimit: dto.ageLimit,
          city: dto.city,
          ...(dto.venueId !== undefined && {
            venue: dto.venueId ? { connect: { id: dto.venueId } } : { disconnect: true },
          }),
          ...(categoryIds && { categories: { set: categoryIds.map((cid) => ({ id: cid })) } }),
        },
        include: EVENT_INCLUDE,
      });
      // Правка черновика публике не видна, сбрасывать кэш афиши незачем.
      if (e.status === EventStatus.published) this.publicCache.clear();
      return toEventDto(updated, true);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') throw statusChanged();
      throw err;
    }
  }

  // ---------- Команды смены состояния ----------

  /** draft → published. Только владелец и только полностью заполненный черновик. */
  async publish(user: AuthUser, id: string): Promise<EventDto> {
    const e = await this.loadOwned(user, id);
    if (e.status !== EventStatus.draft) {
      throw conflict(
        ErrorCode.INVALID_STATE_TRANSITION,
        `Опубликовать можно только черновик, текущий статус — ${e.status}`,
      );
    }

    const now = new Date();
    const issues = readinessIssues({ ...e, venueExists: e.venue !== null, categoryCount: e.categories.length }, now, {
      requireFutureStart: true,
    });
    if (issues.length) {
      throw new AppException(
        HttpStatus.BAD_REQUEST,
        ErrorCode.EVENT_NOT_READY,
        'Черновик нельзя опубликовать: заполните обязательные поля',
        issues,
      );
    }

    const { count } = await this.prisma.event.updateMany({
      where: { id, status: EventStatus.draft },
      data: { status: EventStatus.published, publishedAt: now },
    });
    if (count === 0) throw statusChanged();
    this.publicCache.clear();
    return this.reload(id);
  }

  /** published → hidden. Только модератор и только с причиной. */
  async hide(moderator: AuthUser, id: string, dto: HideEventDto): Promise<EventDto> {
    const e = await this.prisma.event.findUnique({ where: { id }, select: { status: true } });
    if (!e) throw notFound();
    if (e.status !== EventStatus.published) {
      throw conflict(
        ErrorCode.INVALID_STATE_TRANSITION,
        `Скрыть можно только опубликованное событие, текущий статус — ${e.status}`,
      );
    }

    const { count } = await this.prisma.event.updateMany({
      where: { id, status: EventStatus.published },
      data: { status: EventStatus.hidden, hiddenReason: dto.reason, hiddenAt: new Date(), hiddenById: moderator.id },
    });
    if (count === 0) throw statusChanged();
    this.publicCache.clear();
    return this.reload(id);
  }

  // ---------- Вспомогательное ----------

  /** 404, если события нет; 403, если оно чужое. */
  private async loadOwned(user: AuthUser, id: string): Promise<EventWithRelations> {
    const e = await this.prisma.event.findUnique({ where: { id }, include: EVENT_INCLUDE });
    if (!e) throw notFound();
    if (e.ownerId !== user.id) {
      throw new AppException(
        HttpStatus.FORBIDDEN,
        ErrorCode.FORBIDDEN_NOT_OWNER,
        'Изменять событие может только его владелец',
      );
    }
    return e;
  }

  private async reload(id: string): Promise<EventDto> {
    const e = await this.prisma.event.findUniqueOrThrow({ where: { id }, include: EVENT_INCLUDE });
    return toEventDto(e, true);
  }

  /** withModeration: в ответ попадают причина и время скрытия. */
  private async list({ where, orderBy, page, pageSize, withModeration }: ListArgs): Promise<Page<EventDto>> {
    const [total, rows] = await Promise.all([
      this.prisma.event.count({ where }),
      this.prisma.event.findMany({ where, orderBy, ...skipTake({ page, pageSize }), include: EVENT_INCLUDE }),
    ]);
    return { items: rows.map((e) => toEventDto(e, withModeration)), total, page, pageSize };
  }

  /** Число событий по каждому статусу; статусы без событий — 0. */
  private async countByStatus(where: Prisma.EventWhereInput): Promise<Record<EventStatus, number>> {
    const groups = await this.prisma.event.groupBy({ by: ['status'], where, _count: { _all: true } });
    const counts: Record<EventStatus, number> = { draft: 0, published: 0, hidden: 0, archived: 0 };
    for (const g of groups) counts[g.status] = g._count._all;
    return counts;
  }

  /** Проверяет площадку и категории; возвращает id категорий, если их передали. */
  private async checkReferences(
    venueId: string | null | undefined,
    categoryIds: string[] | undefined,
    issues: ErrorDetail[],
  ) {
    if (venueId && !(await this.venues.exists(venueId)))
      issues.push({ field: 'venueId', issue: 'Площадка не найдена' });
    if (categoryIds?.length) {
      const { missing } = await this.catalog.resolve('id', categoryIds);
      if (missing.length) issues.push({ field: 'categoryIds', issue: `Неизвестные категории: ${missing.join(', ')}` });
    }
    if (issues.length) throw AppException.validation('Некорректные данные события', issues);
    return categoryIds;
  }
}
