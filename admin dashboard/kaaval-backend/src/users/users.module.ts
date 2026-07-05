import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SystemModule } from '../system/system.module.js';
import { UsersService } from './users.service.js';
import { UsersController } from './users.controller.js';
import { User } from './entities/user.entity.js';
import { LoginSession } from './entities/user-session.entity.js';
import { Role } from '../auth/entities/role.entity.js';
import { District } from '../districts/entities/district.entity.js';
import { Subdivision } from '../subdivisions/entities/subdivision.entity.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, LoginSession, Role, District, Subdivision]),
    forwardRef(() => SystemModule),
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
