import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, Length } from 'class-validator';

const trimAndLowercase = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

/** `POST /friend-requests`. See backend/CONTEXT.md — Friend Request. */
export class CreateFriendRequestDto {
  @ApiProperty({
    example: 'minhtran',
    description:
      "The recipient's Username — exact match only, same as " +
      'GET /users/:username (see backend/CONTEXT.md — Username).',
  })
  @Transform(trimAndLowercase)
  @IsString()
  @Length(1, 30)
  username!: string;
}
