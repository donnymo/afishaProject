import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 50;
/**
 * OFFSET заставляет базу прочитать и выбросить все пропущенные строки, поэтому
 * глубина листания ограничена: не больше MAX_PAGE * MAX_PAGE_SIZE = 10 000 строк.
 * Дальше нужны фильтры, а не пагинация.
 */
export const MAX_PAGE = 200;

/** Offset-пагинация: page с единицы и не больше MAX_PAGE, pageSize не больше MAX_PAGE_SIZE. */
export class PaginationQueryDto {
  @ApiPropertyOptional({ minimum: 1, maximum: MAX_PAGE, default: 1 })
  @Type(() => Number)
  @IsInt({ message: 'page должен быть целым числом' })
  @Min(1, { message: 'page начинается с 1' })
  @Max(MAX_PAGE, { message: `page не больше ${MAX_PAGE}: уточните фильтры` })
  page: number = 1;

  @ApiPropertyOptional({ minimum: 1, maximum: MAX_PAGE_SIZE, default: DEFAULT_PAGE_SIZE })
  @Type(() => Number)
  @IsInt({ message: 'pageSize должен быть целым числом' })
  @Min(1, { message: 'pageSize не меньше 1' })
  @Max(MAX_PAGE_SIZE, { message: `pageSize не больше ${MAX_PAGE_SIZE}` })
  pageSize: number = DEFAULT_PAGE_SIZE;
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export const skipTake = (q: { page: number; pageSize: number }) => ({
  skip: (q.page - 1) * q.pageSize,
  take: q.pageSize,
});
