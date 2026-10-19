import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CategoryDto } from './catalog.dto.js';

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  list(): Promise<CategoryDto[]> {
    return this.prisma.category.findMany({ select: { id: true, slug: true, name: true }, orderBy: { name: 'asc' } });
  }

  /** Возвращает id существующих категорий и список не найденных значений. */
  async resolve(by: 'id' | 'slug', values: string[]): Promise<{ ids: string[]; missing: string[] }> {
    const unique = [...new Set(values)];
    const found = await this.prisma.category.findMany({
      where: { [by]: { in: unique } },
      select: { id: true, slug: true },
    });
    const known = new Set(found.map((category) => category[by]));
    return { ids: found.map((category) => category.id), missing: unique.filter((value) => !known.has(value)) };
  }
}
