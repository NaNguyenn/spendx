import { Module } from '@nestjs/common';
import { BlocksModule } from '../blocks/blocks.module';
import { PrismaModule } from '../prisma/prisma.module';
import { UsersController } from './users.controller';
import { UsersRepository } from './users.repository';
import { UsersService } from './users.service';

// BlocksModule (backend/CONTEXT.md — Block): GET /users/:username 404s
// identically to an unknown Username when the caller and the target are
// blocked, either direction. Importing it here is one direction only —
// BlocksModule does not import UsersModule back — see
// blocks/blocks.module.ts's doc comment.
@Module({
  imports: [PrismaModule, BlocksModule],
  controllers: [UsersController],
  providers: [UsersService, UsersRepository],
  exports: [UsersRepository, UsersService],
})
export class UsersModule {}
