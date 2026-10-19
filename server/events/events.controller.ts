import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import type { AuthUser } from '../auth/auth-user.js';
import { CurrentUser, Public, Roles } from '../auth/decorators.js';
import { ApiErrors } from '../common/errors/api-errors.decorator.js';
import { uuidPipe } from '../common/uuid-param.js';
import { AppConfig } from '../config/app-config.js';
import { Role } from '../generated/prisma/enums.js';
import {
  CreateEventDto,
  EventDto,
  EventPageDto,
  HideEventDto,
  ListEventsQueryDto,
  ModerationCountsDto,
  ModerationQueryDto,
  MyEventCountsDto,
  MyEventsQueryDto,
  UpdateEventDto,
} from './events.dto.js';
import { EventsService } from './events.service.js';

@ApiTags('Events')
@Controller('events')
export class EventsController {
  constructor(
    private readonly events: EventsService,
    private readonly config: AppConfig,
  ) {}

  @Public()
  @Get()
  @ApiOperation({
    summary: 'Публичная афиша',
    description:
      'Только опубликованные и ещё не закончившиеся события. Фильтры комбинируются через AND, категории внутри фильтра — через OR. ' +
      'Неизвестные параметры и поле сортировки отклоняются с 400.',
  })
  @ApiOkResponse({ type: EventPageDto })
  @ApiErrors(400)
  list(@Query() query: ListEventsQueryDto, @Res({ passthrough: true }) res: Response): Promise<EventPageDto> {
    // Выдача одинакова для всех: CDN может держать её столько же, сколько кэш в памяти.
    // Браузеру — max-age=0, иначе организатор не сразу увидел бы свою публикацию.
    res.setHeader('Cache-Control', `public, max-age=0, s-maxage=${this.config.publicCacheTtlSeconds}`);
    return this.events.listPublic(query);
  }

  @Get('mine')
  @Roles(Role.organizer)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Мои события',
    description: 'Все карточки текущего организатора, включая черновики, скрытые и архивные.',
  })
  @ApiOkResponse({ type: EventPageDto })
  @ApiErrors(400, 401, 403)
  mine(@CurrentUser() user: AuthUser, @Query() query: MyEventsQueryDto): Promise<EventPageDto> {
    return this.events.listMine(user, query);
  }

  @Get('mine/counts')
  @Roles(Role.organizer)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Сколько моих событий в каждом статусе', description: 'Для счётчиков на вкладках.' })
  @ApiOkResponse({ type: MyEventCountsDto })
  @ApiErrors(401, 403)
  mineCounts(@CurrentUser() user: AuthUser): Promise<MyEventCountsDto> {
    return this.events.countMine(user);
  }

  @Get('moderation/counts')
  @Roles(Role.moderator)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Размер очереди модерации по статусам', description: 'Для счётчиков на вкладках.' })
  @ApiOkResponse({ type: ModerationCountsDto })
  @ApiErrors(401, 403)
  moderationCounts(): Promise<ModerationCountsDto> {
    return this.events.countForModeration();
  }

  @Get('moderation')
  @Roles(Role.moderator)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Очередь модерации',
    description: 'Опубликованные (по умолчанию) или скрытые события всех организаторов.',
  })
  @ApiOkResponse({ type: EventPageDto })
  @ApiErrors(400, 401, 403)
  moderation(@Query() query: ModerationQueryDto): Promise<EventPageDto> {
    return this.events.listForModeration(query);
  }

  @Public()
  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Карточка события',
    description:
      'Публике — только актуальное опубликованное событие, иначе 404. Владелец и модератор видят карточку в любом статусе.',
  })
  @ApiOkResponse({ type: EventDto })
  @ApiErrors(400, 404)
  get(@Param('id', uuidPipe()) id: string, @CurrentUser() viewer?: AuthUser): Promise<EventDto> {
    return this.events.getForViewer(id, viewer);
  }

  @Post()
  @Roles(Role.organizer)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Создать черновик',
    description: 'Обязательно только название; остальное можно заполнить позже.',
  })
  @ApiCreatedResponse({ type: EventDto })
  @ApiErrors(400, 401, 403)
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateEventDto): Promise<EventDto> {
    return this.events.create(user, dto);
  }

  @Patch(':id')
  @Roles(Role.organizer)
  @ApiBearerAuth()
  @ApiOkResponse({ type: EventDto })
  @ApiErrors(400, 401, 403, 404, 409)
  @ApiOperation({
    summary: 'Изменить поля своего события',
    description:
      'Статус так не меняется — для этого есть /publish и /hide. Поле status в теле даёт 400. ' +
      'Скрытое и архивное событие не изменяется (409).',
  })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', uuidPipe()) id: string,
    @Body() dto: UpdateEventDto,
  ): Promise<EventDto> {
    return this.events.update(user, id, dto);
  }

  @Post(':id/publish')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.organizer)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Опубликовать черновик (draft → published)' })
  @ApiOkResponse({ type: EventDto })
  @ApiErrors(400, 401, 403, 404, 409)
  publish(@CurrentUser() user: AuthUser, @Param('id', uuidPipe()) id: string): Promise<EventDto> {
    return this.events.publish(user, id);
  }

  @Post(':id/hide')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.moderator)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Скрыть опубликованное событие (published → hidden)',
    description: 'Причина обязательна, её увидит владелец.',
  })
  @ApiOkResponse({ type: EventDto })
  @ApiErrors(400, 401, 403, 404, 409)
  hide(
    @CurrentUser() user: AuthUser,
    @Param('id', uuidPipe()) id: string,
    @Body() dto: HideEventDto,
  ): Promise<EventDto> {
    return this.events.hide(user, id, dto);
  }
}
