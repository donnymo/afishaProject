import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators.js';
import { CategoryDto } from './catalog.dto.js';
import { CatalogService } from './catalog.service.js';

@ApiTags('Catalog')
@Controller('categories')
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Справочник категорий' })
  @ApiOkResponse({ type: [CategoryDto] })
  list(): Promise<CategoryDto[]> {
    return this.catalog.list();
  }
}
