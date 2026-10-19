import { Module } from '@nestjs/common';
import { CatalogModule } from '../catalog/catalog.module.js';
import { VenuesModule } from '../venues/venues.module.js';
import { EventsArchiver } from './events-archiver.js';
import { EventsController } from './events.controller.js';
import { EventsService } from './events.service.js';
import { PublicEventsCache } from './public-events-cache.js';

@Module({
  imports: [CatalogModule, VenuesModule],
  controllers: [EventsController],
  providers: [EventsService, EventsArchiver, PublicEventsCache],
})
export class EventsModule {}
