import { HttpStatus, Injectable } from '@nestjs/common';
import { AppException, ErrorCode } from '../common/errors/app-exception.js';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateVenueDto, VenueDto } from './venues.dto.js';

const VENUE_SELECT = { id: true, name: true, address: true } satisfies Prisma.VenueSelect;

@Injectable()
export class VenuesService {
  constructor(private readonly prisma: PrismaService) {}

  list(): Promise<VenueDto[]> {
    return this.prisma.venue.findMany({ select: VENUE_SELECT, orderBy: { name: 'asc' } });
  }

  async get(id: string): Promise<VenueDto> {
    const venue = await this.prisma.venue.findUnique({ where: { id }, select: VENUE_SELECT });
    if (!venue) throw new AppException(HttpStatus.NOT_FOUND, ErrorCode.VENUE_NOT_FOUND, 'Площадка не найдена');
    return venue;
  }

  async exists(id: string): Promise<boolean> {
    return (await this.prisma.venue.count({ where: { id } })) > 0;
  }

  create(dto: CreateVenueDto): Promise<VenueDto> {
    return this.prisma.venue.create({ data: dto, select: VENUE_SELECT });
  }
}
