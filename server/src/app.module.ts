import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { RedisModule } from './redis/redis.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { UsersModule } from './modules/users/users.module.js';
import { CatalogueModule } from './modules/catalogue/catalogue.module.js';
import { PlaybackModule } from './modules/playback/playback.module.js';
import { StorageModule } from './modules/storage/storage.module.js';
import { VibesModule } from './modules/vibes/vibes.module.js';
import { SearchModule } from './modules/search/search.module.js';
import { HomeModule } from './modules/home/home.module.js';
import { EventsModule } from './modules/events/events.module.js';
import { LibraryModule } from './modules/library/library.module.js';
import { PlaylistsModule } from './modules/playlists/playlists.module.js';
import { RecommendationsModule } from './modules/recommendations/recommendations.module.js';
import { AiModule } from './modules/ai/ai.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    RedisModule,
    StorageModule,
    AuthModule,
    UsersModule,
    CatalogueModule,
    PlaybackModule,
    VibesModule,
    SearchModule,
    HomeModule,
    EventsModule,
    LibraryModule,
    PlaylistsModule,
    RecommendationsModule,
    AiModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
