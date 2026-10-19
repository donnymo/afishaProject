import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module.js';
import { CatalogModule } from './catalog/catalog.module.js';
import { ConfigModule } from './config/config.module.js';
import { EventsModule } from './events/events.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { VenuesModule } from './venues/venues.module.js';

@Module({
  imports: [ConfigModule, PrismaModule, AuthModule, CatalogModule, VenuesModule, EventsModule],
})
export class AppModule {}
