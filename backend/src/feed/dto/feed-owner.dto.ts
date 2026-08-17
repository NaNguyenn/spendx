import { ApiProperty } from '@nestjs/swagger';

/**
 * A Feed item's owner, public identity only (backend/CONTEXT.md — Username,
 * Display Name): email is never public.
 */
export class FeedOwnerDto {
  @ApiProperty()
  username!: string;

  @ApiProperty()
  displayName!: string;
}
