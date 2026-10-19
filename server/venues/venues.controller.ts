import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public, Roles } from '../auth/decorators.js';
import { ApiErrors } from '../common/errors/api-errors.decorator.js';
import { uuidPipe } from '../common/uuid-param.js';
import { Role } from '../generated/prisma/enums.js';
import { CreateVenueDto, VenueDto } from './venues.dto.js';
import { VenuesService } from './venues.service.js';

@ApiTags('Venues')
@Controller('venues')
export class VenuesController {
  constructor(private readonly venues: VenuesService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Список площадок' })
  @ApiOkResponse({ type: [VenueDto] })
  list(): Promise<VenueDto[]> {
    return this.venues.list();
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Площадка по id' })
  @ApiOkResponse({ type: VenueDto })
  @ApiErrors(400, 404)
  get(@Param('id', uuidPipe()) id: string): Promise<VenueDto> {
    return this.venues.get(id);
  }

  @Post()
  @Roles(Role.organizer, Role.moderator)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Добавить площадку',
    description: 'Площадки общие: организатор добавляет новую, если её нет в справочнике.',
  })
  @ApiCreatedResponse({ type: VenueDto })
  @ApiErrors(400, 401, 403)
  create(@Body() dto: CreateVenueDto): Promise<VenueDto> {
    return this.venues.create(dto);
  }
}
