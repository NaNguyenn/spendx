import { ApiProperty } from '@nestjs/swagger';
import { CATEGORIES, type Category } from '../../domain/category';

/** One Category's total within a Period — see `PeriodStatisticsDto`. */
export class CategoryTotalDto {
  @ApiProperty({ enum: CATEGORIES, enumName: 'Category' })
  category!: Category;

  @ApiProperty({
    description:
      'The summed Converted Amount for this Category within the Period, ' +
      "in the owner's Preferred Currency, as a fixed-scale decimal string " +
      '(4 decimal places). Never a JSON number.',
    example: '450000.0000',
  })
  total!: string;
}
