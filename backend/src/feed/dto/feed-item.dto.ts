import { ApiProperty } from '@nestjs/swagger';
import { ExpenseDto } from '../../expenses/dto/expense.dto';
import { FeedOwnerDto } from './feed-owner.dto';

/** One Expense as it appears in the Feed: an `ExpenseDto` plus its owner. */
export class FeedItemDto extends ExpenseDto {
  @ApiProperty({ type: FeedOwnerDto })
  owner!: FeedOwnerDto;
}
