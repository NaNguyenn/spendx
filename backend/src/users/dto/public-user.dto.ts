import { ApiProperty } from '@nestjs/swagger';

/**
 * How a User appears in a response describing somebody else. No email, no
 * `passwordHash` — see `../user-view.ts`, the single place a User row becomes
 * a response body.
 */
export class PublicUserDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ description: "The User's unique public handle." })
  username!: string;

  @ApiProperty()
  displayName!: string;
}
