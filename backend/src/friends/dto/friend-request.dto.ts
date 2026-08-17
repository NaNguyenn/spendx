import { ApiProperty } from '@nestjs/swagger';
import { PublicUserDto } from '../../users/dto/public-user.dto';

/**
 * How a Friend Request appears in a response — see backend/CONTEXT.md —
 * Friend Request: "a pending offer of Friendship". Both parties are
 * PublicUserDto-shaped: no email, no other private field, whichever side of
 * the request the reader is on. See `../friend-request-view.ts`.
 */
export class FriendRequestDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ type: PublicUserDto })
  sender!: PublicUserDto;

  @ApiProperty({ type: PublicUserDto })
  recipient!: PublicUserDto;

  @ApiProperty({ description: 'ISO 8601' })
  createdAt!: string;
}
