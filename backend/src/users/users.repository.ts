import { Injectable } from '@nestjs/common';
import type { Locale } from '../domain/locale';
import type { SupportedCurrency } from '../domain/currency';
import type { User } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateUserData {
  email: string;
  username: string;
  displayName: string;
  passwordHash: string;
  preferredCurrency: SupportedCurrency;
  locale: Locale;
}

// Only Locale today — `PATCH /users/me` grows this interface (Preferred
// Currency, Display Name) as later tickets add the fields it may update.
export interface UpdateUserData {
  locale: Locale;
}

/**
 * All persistence for the User model. Nothing above this class knows Prisma's
 * query API — callers pass and receive domain values.
 *
 * Email and Username are stored lowercased (see backend/CONTEXT.md and the
 * sign-up DTO), so an exact-match lookup here is already the case-insensitive
 * lookup the product wants as long as the caller lowercases first.
 */
@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findByUsername(username: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { username } });
  }

  create(data: CreateUserData): Promise<User> {
    return this.prisma.user.create({ data });
  }

  update(id: string, data: UpdateUserData): Promise<User> {
    return this.prisma.user.update({ where: { id }, data });
  }
}
