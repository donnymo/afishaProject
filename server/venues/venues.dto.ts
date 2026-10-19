import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { trim } from '../common/transforms.js';

export class VenueDto {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty({ example: 'Концертный зал «Северный»' }) name: string;
  @ApiProperty({ example: 'Новослободская ул., 24' }) address: string;
}

export class CreateVenueDto {
  @ApiProperty({ example: 'Клуб «Подвал»' })
  @Transform(trim)
  @IsString({ message: 'Укажите название площадки' })
  @MinLength(2, { message: 'Название не короче 2 символов' })
  @MaxLength(160, { message: 'Название не длиннее 160 символов' })
  name: string;

  @ApiProperty({ example: 'ул. Покровка, 3' })
  @Transform(trim)
  @IsString({ message: 'Укажите адрес' })
  @MinLength(5, { message: 'Адрес не короче 5 символов' })
  @MaxLength(300, { message: 'Адрес не длиннее 300 символов' })
  address: string;
}
