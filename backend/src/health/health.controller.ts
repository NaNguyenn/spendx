import { Controller, Get } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import { HealthResponseDto, HealthUnavailableDto } from './health.dto';
import { HealthService } from './health.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Get()
  @ApiOperation({
    summary: 'Liveness of the API and its database',
    description:
      'Round-trips a query to Postgres, so a green response means the ' +
      'connection is genuinely usable rather than merely configured.',
  })
  @ApiOkResponse({ type: HealthResponseDto })
  @ApiServiceUnavailableResponse({ type: HealthUnavailableDto })
  check(): Promise<HealthResponseDto> {
    return this.health.check();
  }
}
