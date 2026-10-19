import { applyDecorators } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { CategoryDto } from '../catalog/catalog.dto.js';
import { PaginationQueryDto } from '../common/pagination.js';
import { splitList, trim, trimLower } from '../common/transforms.js';
import { EventStatus } from '../generated/prisma/enums.js';
import { VenueDto } from '../venues/venues.dto.js';
import { AGE_LIMITS, MAX_PRICE, SORT_FIELDS, SORT_ORDERS, type SortField, type SortOrder } from './event-rules.js';

const ISO = { strict: true, strictSeparator: true };
const SLUG = /^[a-z0-9-]{1,40}$/;

// ---------- Общие правила полей ----------

/** Поле можно не передавать, но null недопустим (в отличие от @IsOptional). */
const NotNullIfPresent = () => ValidateIf((_, value) => value !== undefined);

const TitleRules = () =>
  applyDecorators(
    Transform(trim),
    IsString({ message: 'Укажите название' }),
    MinLength(3, { message: 'Название не короче 3 символов' }),
    MaxLength(200, { message: 'Название не длиннее 200 символов' }),
  );

const CityRules = () =>
  applyDecorators(Transform(trimLower), Matches(SLUG, { message: 'city — код города латиницей, например moscow' }));

const CategoryIdsRules = () =>
  applyDecorators(
    IsArray({ message: 'categoryIds — массив UUID' }),
    ArrayMaxSize(5, { message: 'Не больше 5 категорий' }),
    ArrayUnique({ message: 'Категории не должны повторяться' }),
    IsUUID('all', { each: true, message: 'categoryIds — массив UUID' }),
  );

const PriceRules = (field: string, message: string) =>
  applyDecorators(
    IsInt({ message }),
    Min(0, { message: `${field} не может быть отрицательной` }),
    Max(MAX_PRICE, { message: `${field} не больше ${MAX_PRICE}` }),
  );

// ---------- Запросы ----------

export class ListEventsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    example: '2026-10-10',
    description:
      'Начало диапазона (ISO 8601). Дата без времени — начало дня по Москве. Попадают события, которые ещё идут в этот момент.',
  })
  @IsOptional()
  @IsISO8601(ISO, { message: 'from — дата в формате ISO 8601' })
  from?: string;

  @ApiPropertyOptional({
    example: '2026-10-11',
    description: 'Конец диапазона (ISO 8601). Дата без времени — конец дня по Москве.',
  })
  @IsOptional()
  @IsISO8601(ISO, { message: 'to — дата в формате ISO 8601' })
  to?: string;

  @ApiPropertyOptional({
    example: 'concert,theatre',
    description: 'Слаги категорий через запятую; подходит событие хотя бы с одной из них',
  })
  @IsOptional()
  @Transform(splitList)
  @IsArray()
  @ArrayMaxSize(10, { message: 'Не больше 10 категорий' })
  @Matches(SLUG, { each: true, message: 'category — слаги из GET /categories через запятую' })
  category?: string[];

  @ApiPropertyOptional({ example: 'moscow' })
  @IsOptional()
  @CityRules()
  city?: string;

  @ApiPropertyOptional({ minimum: 0, example: 0 })
  @IsOptional()
  @Type(() => Number)
  @PriceRules('minPrice', 'minPrice — целое число рублей')
  minPrice?: number;

  @ApiPropertyOptional({ minimum: 0, example: 1500 })
  @IsOptional()
  @Type(() => Number)
  @PriceRules('maxPrice', 'maxPrice — целое число рублей')
  maxPrice?: number;

  @ApiPropertyOptional({ enum: SORT_FIELDS, default: 'date' })
  @IsIn(SORT_FIELDS, { message: `sort: допустимо ${SORT_FIELDS.join(' или ')}` })
  sort: SortField = 'date';

  @ApiPropertyOptional({ enum: SORT_ORDERS, default: 'asc' })
  @IsIn(SORT_ORDERS, { message: `order: допустимо ${SORT_ORDERS.join(' или ')}` })
  order: SortOrder = 'asc';
}

export class MyEventsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: EventStatus, enumName: 'EventStatus' })
  @IsOptional()
  @IsIn(Object.values(EventStatus), { message: 'status: draft, published, hidden или archived' })
  status?: EventStatus;
}

export class ModerationQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: [EventStatus.published, EventStatus.hidden], default: EventStatus.published })
  @IsIn([EventStatus.published, EventStatus.hidden], { message: 'status: published или hidden' })
  status: EventStatus = EventStatus.published;
}

// ---------- Тела команд ----------

export class CreateEventDto {
  @ApiProperty({ example: 'Лекция о звукорежиссуре кино', minLength: 3, maxLength: 200 })
  @TitleRules()
  title: string;

  @ApiPropertyOptional({ nullable: true, maxLength: 5000 })
  @IsOptional()
  @Transform(trim)
  @IsString({ message: 'Описание должно быть строкой' })
  @MaxLength(5000, { message: 'Описание не длиннее 5000 символов' })
  description?: string | null;

  @ApiPropertyOptional({ nullable: true, format: 'date-time', example: '2026-11-02T19:00:00+03:00' })
  @IsOptional()
  @IsISO8601(ISO, { message: 'startsAt — дата и время в формате ISO 8601' })
  startsAt?: string | null;

  @ApiPropertyOptional({ nullable: true, format: 'date-time', example: '2026-11-02T21:00:00+03:00' })
  @IsOptional()
  @IsISO8601(ISO, { message: 'endsAt — дата и время в формате ISO 8601' })
  endsAt?: string | null;

  @ApiPropertyOptional({ nullable: true, minimum: 0, description: 'Рубли, 0 — бесплатно' })
  @IsOptional()
  @PriceRules('Цена', 'Цена — целое число рублей')
  price?: number | null;

  @ApiPropertyOptional({ nullable: true, enum: AGE_LIMITS })
  @IsOptional()
  @IsIn(AGE_LIMITS, { message: `ageLimit: одно из ${AGE_LIMITS.join(', ')}` })
  ageLimit?: number | null;

  @ApiPropertyOptional({ example: 'moscow', default: 'moscow' })
  @NotNullIfPresent()
  @CityRules()
  city?: string;

  @ApiPropertyOptional({ nullable: true, format: 'uuid' })
  @IsOptional()
  @IsUUID('all', { message: 'venueId — UUID площадки' })
  venueId?: string | null;

  @ApiPropertyOptional({ type: [String], format: 'uuid', maxItems: 5 })
  @NotNullIfPresent()
  @CategoryIdsRules()
  categoryIds?: string[];
}

/**
 * PATCH: все поля необязательны, null очищает поле черновика.
 * title, city и categoryIds объявлены заново: PartialType пропустил бы для них null.
 * Поля status здесь нет — статус меняется только командами.
 */
export class UpdateEventDto extends PartialType(OmitType(CreateEventDto, ['title', 'city', 'categoryIds'] as const)) {
  @ApiPropertyOptional({ minLength: 3, maxLength: 200 })
  @NotNullIfPresent()
  @TitleRules()
  title?: string;

  @ApiPropertyOptional({ example: 'moscow' })
  @NotNullIfPresent()
  @CityRules()
  city?: string;

  @ApiPropertyOptional({ type: [String], format: 'uuid', maxItems: 5 })
  @NotNullIfPresent()
  @CategoryIdsRules()
  categoryIds?: string[];
}

export class HideEventDto {
  @ApiProperty({
    minLength: 10,
    maxLength: 500,
    example: 'Недостоверная цена: на площадке вход платный, в карточке — бесплатно.',
  })
  @Transform(trim)
  @IsString({ message: 'Укажите причину скрытия' })
  @MinLength(10, { message: 'Причина не короче 10 символов' })
  @MaxLength(500, { message: 'Причина не длиннее 500 символов' })
  reason: string;
}

// ---------- Ответы ----------

export class EventOwnerDto {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty({ example: 'Студия «Резонанс»' }) name: string;
}

export class EventDto {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty() title: string;
  @ApiProperty({ nullable: true, type: String }) description: string | null;
  @ApiProperty({ nullable: true, type: String, format: 'date-time' }) startsAt: string | null;
  @ApiProperty({ nullable: true, type: String, format: 'date-time' }) endsAt: string | null;
  @ApiProperty({ nullable: true, type: Number, description: 'Рубли, 0 — бесплатно' }) price: number | null;
  @ApiProperty({ nullable: true, type: Number, enum: AGE_LIMITS }) ageLimit: number | null;
  @ApiProperty({ example: 'moscow' }) city: string;
  @ApiProperty({ enum: EventStatus, enumName: 'EventStatus' }) status: EventStatus;
  @ApiProperty({ type: VenueDto, nullable: true }) venue: VenueDto | null;
  @ApiProperty({ type: [CategoryDto] }) categories: CategoryDto[];
  @ApiProperty({ type: EventOwnerDto }) owner: EventOwnerDto;
  @ApiProperty({ nullable: true, type: String, format: 'date-time' }) publishedAt: string | null;

  @ApiPropertyOptional({ nullable: true, type: String, description: 'Только для владельца и модератора' })
  hiddenReason?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    type: String,
    format: 'date-time',
    description: 'Только для владельца и модератора',
  })
  hiddenAt?: string | null;

  @ApiProperty({ type: String, format: 'date-time' }) createdAt: string;
  @ApiProperty({ type: String, format: 'date-time' }) updatedAt: string;
}

export class MyEventCountsDto {
  @ApiProperty({ example: 7 }) all: number;
  @ApiProperty({ example: 2 }) draft: number;
  @ApiProperty({ example: 3 }) published: number;
  @ApiProperty({ example: 1 }) hidden: number;
  @ApiProperty({ example: 1 }) archived: number;
}

export class ModerationCountsDto {
  @ApiProperty({ example: 12 }) published: number;
  @ApiProperty({ example: 2 }) hidden: number;
}

export class EventPageDto {
  @ApiProperty({ type: [EventDto] }) items: EventDto[];
  @ApiProperty({ example: 13, description: 'Сколько записей подходит под фильтр всего' }) total: number;
  @ApiProperty({ example: 1 }) page: number;
  @ApiProperty({ example: 20 }) pageSize: number;
}
