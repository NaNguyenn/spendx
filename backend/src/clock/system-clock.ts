import { Injectable } from '@nestjs/common';
import type { Clock } from './clock';

/** The real Clock: wall-clock time. Everywhere except tests. */
@Injectable()
export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}
