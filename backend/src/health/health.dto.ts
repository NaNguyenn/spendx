import { ApiProperty } from '@nestjs/swagger';

export class HealthResponseDto {
  @ApiProperty({ enum: ['ok'], example: 'ok' })
  status!: 'ok';

  @ApiProperty({ enum: ['up'], example: 'up' })
  database!: 'up';
}

/** The 503 body. Part of the contract so the app has a type for the failure. */
export class HealthUnavailableDto {
  @ApiProperty({ enum: ['error'], example: 'error' })
  status!: 'error';

  @ApiProperty({ enum: ['down'], example: 'down' })
  database!: 'down';
}
