import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { UsersRepository } from '../users/users.repository';
import type { AuthenticatedRequest } from './authenticated-request';
import type { JwtPayload } from './jwt-payload';
import { IS_PUBLIC_KEY } from './public.decorator';

/**
 * Protects every route by default (registered as `APP_GUARD` — see
 * AuthModule). `@Public()` is the only opt-out, so a new endpoint is
 * protected unless someone deliberately says otherwise.
 *
 * A missing, malformed, expired, or well-signed-but-unknown-subject token all
 * fail the same way: 401, no detail about which — telling them apart would
 * help an attacker more than it would help a legitimate client.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly usersRepository: UsersRepository,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = extractBearerToken(request);
    if (!token) {
      throw new UnauthorizedException();
    }

    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(token);
    } catch {
      throw new UnauthorizedException();
    }

    // Covers a deleted account: the token is well-signed but its subject no
    // longer exists.
    const user = await this.usersRepository.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException();
    }

    request.user = { id: user.id };
    return true;
  }
}

function extractBearerToken(request: AuthenticatedRequest): string | undefined {
  const header = request.headers.authorization;
  if (!header) return undefined;

  const [scheme, token] = header.split(' ');
  return scheme === 'Bearer' && token ? token : undefined;
}
