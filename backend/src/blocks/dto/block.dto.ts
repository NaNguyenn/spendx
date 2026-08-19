import { ApiProperty } from '@nestjs/swagger';
import { PublicUserDto } from '../../users/dto/public-user.dto';

/**
 * How a Block appears in a response (see backend/CONTEXT.md — Block).
 * Directional: `blockedUser` is always the User the caller blocked, never
 * the other way around — GET /blocks and DELETE /blocks/:username never
 * reveal the reverse direction, since a Block someone else placed on the
 * caller is invisible to the caller by definition. See `../block-view.ts`.
 */
export class BlockDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ type: PublicUserDto })
  blockedUser!: PublicUserDto;

  @ApiProperty({ description: 'ISO 8601' })
  createdAt!: string;
}
