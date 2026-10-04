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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
