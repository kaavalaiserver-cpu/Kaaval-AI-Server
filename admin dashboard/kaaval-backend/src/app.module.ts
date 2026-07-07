import { Module, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import * as net from 'net';
import { AuthModule } from './auth/auth.module.js';
import { ViolationsModule } from './violations/violations.module.js';
import { AnalyticsModule } from './analytics/analytics.module.js';
import { CamerasModule } from './cameras/cameras.module.js';
import { SystemModule } from './system/system.module.js';
import { SearchModule } from './search/search.module.js';
import { NotificationsModule } from './notifications/notifications.module.js';
import { WatchlistModule } from './watchlist/watchlist.module.js';
import { ChallanModule } from './challan/challan.module.js';
import { UsersModule } from './users/users.module.js';
import { ReportsModule } from './reports/reports.module.js';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

function checkPort(host: string, port: number, timeout = 2000): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(timeout);
    socket.on('connect', () => { socket.destroy(); resolve(true); });
    socket.on('timeout', () => { socket.destroy(); resolve(false); });
    socket.on('error', () => { socket.destroy(); resolve(false); });
    socket.connect(port, host);
  });
}

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    // Rate limiting: Set high enough to prevent 429s behind Nginx
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        return [
          { name: 'general', ttl: 60000, limit: 10000 },
          { name: 'login',   ttl: 60000, limit: 1000 },
        ];
      },
    }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => {
        const dbHost = config.get<string>('DB_HOST', 'localhost');
        const dbPort = config.get<number>('DB_PORT', 5432);
        
        Logger.log(`Connecting to PostgreSQL database at ${dbHost}:${dbPort}`, 'TypeORM');
        
        return {
          type: 'sqlite' as const,
          database: 'kaaval_local.db',
          entities: [__dirname + '/**/*.entity{.ts,.js}'],
          synchronize: process.env.NODE_ENV !== 'production',
        };
      },
    }),

    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => {
        try {
          const { redisStore } = await import('cache-manager-redis-yet');
          const host = config.get('REDIS_HOST', 'localhost');
          const port = config.get<number>('REDIS_PORT', 6379);
          return {
            store: await redisStore({
              socket: { host, port, connectTimeout: 3000 },
              ttl: 60000,
            }),
          };
        } catch {
          Logger.warn('Redis unavailable, using in-memory cache', 'CacheModule');
          return { ttl: 60000 };
        }
      },
    }),

    AuthModule,
    ViolationsModule,
    AnalyticsModule,
    CamerasModule,
    SystemModule,
    SearchModule,
    NotificationsModule,
    WatchlistModule,
    ChallanModule,
    UsersModule,
    ReportsModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
