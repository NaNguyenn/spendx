import { Body, Controller, Get, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUserId } from '../auth/current-user.decorator';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { ExpenseDto } from './dto/expense.dto';
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
}
