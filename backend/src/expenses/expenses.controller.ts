import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUserId } from '../auth/current-user.decorator';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { ExpenseDto } from './dto/expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { ExpensesService } from './expenses.service';

@ApiTags('expenses')
@ApiBearerAuth()
@Controller('expenses')
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Post()
  @ApiOperation({ summary: 'Log an Expense' })
  @ApiCreatedResponse({ type: ExpenseDto })
  create(
    @CurrentUserId() ownerId: string,
    @Body() dto: CreateExpenseDto,
  ): Promise<ExpenseDto> {
    return this.expensesService.create(ownerId, dto);
  }

  @Get()
  @ApiOperation({
    summary: "The caller's own Expenses",
    description: 'Every Visibility, newest logged first. Owner-only for now.',
  })
  @ApiOkResponse({ type: ExpenseDto, isArray: true })
  findAll(@CurrentUserId() ownerId: string): Promise<ExpenseDto[]> {
    return this.expensesService.findAllForOwner(ownerId);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Edit an Expense',
    description:
      'Owner-only. The Converted Amount is re-derived at the original ' +
      "logging date's Daily Rate, never the edit date's (ADR-0002).",
  })
  @ApiOkResponse({ type: ExpenseDto })
  @ApiNotFoundResponse({
    description: "Not the caller's Expense, or no such Expense.",
  })
  update(
    @CurrentUserId() ownerId: string,
    @Param('id') id: string,
    @Body() dto: UpdateExpenseDto,
  ): Promise<ExpenseDto> {
    return this.expensesService.update(ownerId, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Delete an Expense',
    description: 'Owner-only. Removes it everywhere, with no residue.',
  })
  @ApiNoContentResponse({ description: 'Deleted.' })
  @ApiNotFoundResponse({
    description: "Not the caller's Expense, or no such Expense.",
  })
  remove(
    @CurrentUserId() ownerId: string,
    @Param('id') id: string,
  ): Promise<void> {
    return this.expensesService.delete(ownerId, id);
  }
}
