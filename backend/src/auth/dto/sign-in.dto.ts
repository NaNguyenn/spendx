import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class SignInDto {
  @ApiProperty({ example: 'minh@spendx.app' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  email!: string;

  // Deliberately not length-checked, unlike SignUpDto. Rejecting a short
  // password here with a 400 naming the field, while a long wrong one gets the
  // uniform 401, would hand back through validation exactly the distinction
  // signIn() takes care not to make — and would lock out any account whose
  // password predates the current rule.
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  password!: string;
}
