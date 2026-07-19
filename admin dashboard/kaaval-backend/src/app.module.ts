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
import { AuditLogsModule } from './audit-logs/audit-logs.module.js';
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
        const dbType = config.get<string>('DB_TYPE', 'sqlite');
        if (dbType === 'postgres') {
          const dbHost = config.get<string>('DB_HOST', 'postgres');
          const dbPort = config.get<number>('DB_PORT', 5432);
          const dbUsername = config.get<string>('DB_USERNAME', 'postgres');
          const dbPassword = config.get<string>('DB_PASSWORD', 'postgres');
          const dbName = config.get<string>('DB_NAME', 'kaaval_ai');
          
          Logger.log(`Connecting to PostgreSQL database at ${dbHost}:${dbPort}`, 'TypeORM');
          
          return {
            type: 'postgres' as const,
            host: dbHost,
            port: dbPort,
            username: dbUsername,
            password: dbPassword,
            database: dbName,
            entities: [__dirname + '/**/*.entity{.ts,.js}'],
            synchronize: true, // In production, consider migrations instead
          };
        } else {
          Logger.log(`Connecting to local SQLite database kaaval_local.db`, 'TypeORM');
          return {
            type: 'sqlite' as const,
            database: 'kaaval_local.db',
            entities: [__dirname + '/**/*.entity{.ts,.js}'],
            synchronize: true,
          };
        }
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
    AuditLogsModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
