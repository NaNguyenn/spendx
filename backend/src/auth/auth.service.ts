import {
  ConflictException,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { EmailVerificationService } from '../email-verification/email-verification.service';
import { Prisma, type User } from '../generated/prisma/client';
import { toPrivateUser } from '../users/user-view';
import { UsersRepository } from '../users/users.repository';
import { AuthResponseDto } from './dto/auth-response.dto';
import { SignInDto } from './dto/sign-in.dto';
import { SignUpDto } from './dto/sign-up.dto';
import { PASSWORD_HASHER, type PasswordHasher } from './password-hasher';

// Used in place of a real stored hash when sign-in is given an unknown
// email, so verification costs the same whether or not the account exists —
// timing must not be an oracle for "does this email have an account".
const DUMMY_PASSWORD_FOR_TIMING_SAFETY = 'spendx-sign-in-timing-safety-dummy';

const INVALID_CREDENTIALS_MESSAGE = 'Invalid email or password';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  // Computed once per process and reused: hashing it fresh on every unknown
  // -email sign-in would work too, but caching means an unknown-email
  // request costs exactly one scrypt call, same as a known one.
  private readonly dummyHash: Promise<string>;

  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly jwtService: JwtService,
    @Inject(PASSWORD_HASHER) private readonly passwordHasher: PasswordHasher,
    private readonly emailVerificationService: EmailVerificationService,
  ) {
    this.dummyHash = this.passwordHasher.hash(DUMMY_PASSWORD_FOR_TIMING_SAFETY);
  }

  async signUp(dto: SignUpDto): Promise<AuthResponseDto> {
    // Pre-checked (rather than left entirely to the unique index) so a
    // collision on both fields deterministically reports the email, per the
    // API contract. The catch below is the safety net for the race between
    // this check and the insert.
    if (await this.usersRepository.findByEmail(dto.email)) {
      throw new ConflictException('Email already registered');
    }
    if (await this.usersRepository.findByUsername(dto.username)) {
      throw new ConflictException('Username already taken');
    }

    const passwordHash = await this.passwordHasher.hash(dto.password);

    let user: User;
    try {
      user = await this.usersRepository.create({
        email: dto.email,
        username: dto.username,
        displayName: dto.displayName,
        preferredCurrency: dto.preferredCurrency,
        locale: dto.locale,
        passwordHash,
      });
    } catch (error: unknown) {
      rethrowAsConflict(error);
    }

    await this.sendVerificationEmailBestEffort(user.id);

    return this.issueSession(user);
  }

  async signIn(dto: SignInDto): Promise<AuthResponseDto> {
    const user = await this.usersRepository.findByEmail(dto.email);
    const hashToCompareAgainst = user?.passwordHash ?? (await this.dummyHash);

    const passwordMatches = await this.passwordHasher.verify(
      dto.password,
      hashToCompareAgainst,
    );

    if (!user || !passwordMatches) {
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    return this.issueSession(user);
  }

  private async issueSession(user: User): Promise<AuthResponseDto> {
    const accessToken = await this.jwtService.signAsync({ sub: user.id });
    return { accessToken, user: toPrivateUser(user) };
  }

  /**
   * Sign-up must succeed even when the verification email cannot be sent —
   * Email Verification gates nothing (backend/CONTEXT.md). Only sign-up
   * swallows this failure; the dedicated `POST /email-verification/request`
   * still surfaces a sender failure as a 500 to its caller.
   */
  private async sendVerificationEmailBestEffort(userId: string): Promise<void> {
    try {
      await this.emailVerificationService.requestVerification(userId);
    } catch (error: unknown) {
      this.logger.error(
        'Failed to send the Email Verification code after sign-up',
        error instanceof Error ? error.stack : error,
      );
    }
  }
}

/** Maps a unique-constraint violation on `users` to the field that collided. */
/**
 * Re-throws a unique-constraint violation as the 409 that names the colliding
 * field. Anything else is not ours to interpret, so it propagates unchanged —
 * which is why this never returns.
 */
function rethrowAsConflict(error: unknown): never {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  ) {
    const target = error.meta?.['target'];
    const columns = Array.isArray(target) ? target : [];
    if (columns.includes('email')) {
      throw new ConflictException('Email already registered');
    }
    if (columns.includes('username')) {
      throw new ConflictException('Username already taken');
    }
  }
  throw error;
}
