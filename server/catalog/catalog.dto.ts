import { ApiProperty } from '@nestjs/swagger';

export class CategoryDto {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty({ example: 'concert', description: 'Используется в фильтре GET /events?category=' }) slug: string;
  @ApiProperty({ example: 'Концерты' }) name: string;
}
