import { ApiProperty } from '@nestjs/swagger';
import { FriendRequestDto } from './friend-request.dto';

/** `GET /friend-requests`: the caller's own pending requests, both directions. */
export class FriendRequestsDto {
  @ApiProperty({
    type: FriendRequestDto,
    isArray: true,
    description: 'Requests sent to the caller, newest first.',
  })
  incoming!: FriendRequestDto[];

  @ApiProperty({
    type: FriendRequestDto,
    isArray: true,
    description: 'Requests the caller sent, newest first.',
  })
  outgoing!: FriendRequestDto[];
}
