import { ApiProperty } from '@nestjs/swagger';
import { PrivateUserDto } from '../../users/dto/private-user.dto';

export class AuthResponseDto {
  @ApiProperty()
  accessToken!: string;

  @ApiProperty({ type: PrivateUserDto })
  user!: PrivateUserDto;
}
