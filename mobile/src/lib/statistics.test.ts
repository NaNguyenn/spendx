import {
  categoryShare,
  computeStatisticsDelta,
  nonzeroCategories,
  parseTotal,
} from './statistics';
import type { CategoryTotal } from '@/api/expenses';

function category(
  cat: CategoryTotal['category'],
  total: string,
): CategoryTotal {
  return { category: cat, total };
}

describe('parseTotal', () => {
  it('parses a 4dp decimal string into a number', () => {
    expect(parseTotal('450000.0000')).toBe(450000);
  });

  it('parses a fractional amount', () => {
    expect(parseTotal('12.5000')).toBe(12.5);
  });

  it('parses zero', () => {
    expect(parseTotal('0.0000')).toBe(0);
  });
});

describe('categoryShare', () => {
  it('computes a fraction of the period total', () => {
    expect(categoryShare('1845000.0000', '4850000.0000')).toBeCloseTo(
      0.3804,
      4,
    );
  });

  it('returns 0 when the period total is zero, instead of NaN', () => {
    expect(categoryShare('0.0000', '0.0000')).toBe(0);
  });

  it('sums close to 1 across every category of a period', () => {
    const periodTotal = '4850000.0000';
    const shares = [
      categoryShare('1845000.0000', periodTotal),
      categoryShare('1500000.0000', periodTotal),
      categoryShare('920000.0000', periodTotal),
      categoryShare('390000.0000', periodTotal),
      categoryShare('195000.0000', periodTotal),
    ];
    const sum = shares.reduce((total, share) => total + share, 0);
    expect(sum).toBeCloseTo(1, 10);
  });

  it('handles a tiny nonzero category without underflowing to 0', () => {
    // 1 minor-est unit against a large period total.
    expect(categoryShare('0.0001', '1000000.0000')).toBeGreaterThan(0);
  });

  it('gives a full-share category a fraction of 1', () => {
    expect(categoryShare('4850000.0000', '4850000.0000')).toBe(1);
  });
});

describe('computeStatisticsDelta', () => {
  it('reports "down" when spending decreased', () => {
    const delta = computeStatisticsDelta('4850000.0000', '5500000.0000');
    expect(delta).not.toBeNull();
    expect(delta?.direction).toBe('down');
    expect(delta?.fraction).toBeCloseTo(0.1182, 4);
  });

  it('reports "up" when spending increased', () => {
    const delta = computeStatisticsDelta('5500000.0000', '4850000.0000');
    expect(delta).not.toBeNull();
    expect(delta?.direction).toBe('up');
    expect(delta?.fraction).toBeCloseTo(0.134, 4);
  });

  it('hides the chip when previousTotal is zero — no baseline to compare against', () => {
    expect(computeStatisticsDelta('4850000.0000', '0.0000')).toBeNull();
  });

  it('hides the chip when the current total is zero, even with a nonzero previousTotal', () => {
    expect(computeStatisticsDelta('0.0000', '4850000.0000')).toBeNull();
  });

  it('hides the chip when total and previousTotal are equal', () => {
    expect(computeStatisticsDelta('4850000.0000', '4850000.0000')).toBeNull();
  });

  it('hides the chip when both totals are zero', () => {
    expect(computeStatisticsDelta('0.0000', '0.0000')).toBeNull();
  });

  it('treats a tiny nonzero difference as a real change, not equal', () => {
    const delta = computeStatisticsDelta('100.0001', '100.0000');
    expect(delta).not.toBeNull();
    expect(delta?.direction).toBe('up');
  });
});

describe('nonzeroCategories', () => {
  it('drops zero-total categories, keeping the server-given order', () => {
    const categories = [
      category('food', '1845000.0000'),
      category('housing', '0.0000'),
      category('leisure', '920000.0000'),
      category('investment', '0.0000'),
      category('other', '195000.0000'),
    ];
    expect(nonzeroCategories(categories).map((c) => c.category)).toEqual([
      'food',
      'leisure',
      'other',
    ]);
  });

  it('keeps every category when none are zero', () => {
    const categories = [
      category('food', '1845000.0000'),
      category('housing', '1500000.0000'),
    ];
    expect(nonzeroCategories(categories)).toHaveLength(2);
  });

  it('drops every category in the zero state', () => {
    const categories = [
      category('food', '0.0000'),
      category('housing', '0.0000'),
      category('leisure', '0.0000'),
      category('investment', '0.0000'),
      category('other', '0.0000'),
    ];
    expect(nonzeroCategories(categories)).toEqual([]);
  });

  it('keeps a category as small as one hundred-thousandth of a unit', () => {
    const categories = [category('other', '0.0001')];
    expect(nonzeroCategories(categories)).toHaveLength(1);
  });
});
