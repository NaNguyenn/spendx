import {
  isValidExpenseDescription,
  validateExpenseForm,
  type ExpenseFormValues,
} from './expense-form';

describe('isValidExpenseDescription', () => {
  it('rejects an empty string', () => {
    expect(isValidExpenseDescription('')).toBe(false);
  });

  it('rejects a string that is only whitespace', () => {
    expect(isValidExpenseDescription('   ')).toBe(false);
  });

  it('accepts exactly 1 character after trimming', () => {
    expect(isValidExpenseDescription('  C  ')).toBe(true);
  });

  it('accepts exactly 500 characters after trimming', () => {
    expect(isValidExpenseDescription('a'.repeat(500))).toBe(true);
  });

  it('rejects 501 characters after trimming, one over the maximum', () => {
    expect(isValidExpenseDescription('a'.repeat(501))).toBe(false);
  });

  it('measures the length after trimming, not before', () => {
    expect(isValidExpenseDescription(`  ${'a'.repeat(500)}  `)).toBe(true);
  });
});

describe('validateExpenseForm', () => {
  const validValues: ExpenseFormValues = {
    description: 'Coffee with a friend',
    amount: '48.65',
    locale: 'en',
  };

  it('returns no errors for a fully valid form', () => {
    expect(validateExpenseForm(validValues)).toEqual({});
  });

  it('reports a missing description', () => {
    expect(validateExpenseForm({ ...validValues, description: '  ' })).toEqual({
      description: 'validation.expenseDescription',
    });
  });

  it('reports an amount that fails to parse', () => {
    expect(validateExpenseForm({ ...validValues, amount: '0' })).toEqual({
      amount: 'validation.expenseAmount',
    });
  });

  it('reads a comma as en grouping, not a decimal point, per parseAmountInput', () => {
    // "48,65" is still a *valid* en amount — the comma is en's thousands
    // separator, so this reads as the whole number 4865, not an error. A
    // locale mix-up is only ever a display surprise, never a validation one.
    expect(
      validateExpenseForm({ ...validValues, amount: '48,65', locale: 'en' }),
    ).toEqual({});
  });

  it('reports both fields at once when both are invalid', () => {
    const errors = validateExpenseForm({
      description: '',
      amount: '',
      locale: 'en',
    });
    expect(Object.keys(errors).sort()).toEqual(['amount', 'description']);
  });
});
