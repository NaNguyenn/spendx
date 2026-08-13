import { formatExpenseAmount, parseAmountInput } from './amount-input';

describe('parseAmountInput', () => {
  it('parses a plain en amount using a dot decimal separator', () => {
    expect(parseAmountInput('48.65', 'en')).toBe('48.65');
  });

  it('parses the same amount typed with a vi comma decimal separator', () => {
    expect(parseAmountInput('48,65', 'vi')).toBe('48.65');
  });

  it('strips en thousands grouping (commas)', () => {
    expect(parseAmountInput('1,250,000', 'en')).toBe('1250000');
  });

  it('strips vi thousands grouping (dots) around a comma decimal', () => {
    expect(parseAmountInput('1.250.000,5', 'vi')).toBe('1250000.5');
  });

  it('rejects empty input', () => {
    expect(parseAmountInput('', 'en')).toBeNull();
  });

  it('rejects input that is only whitespace', () => {
    expect(parseAmountInput('   ', 'en')).toBeNull();
  });

  it('rejects a second decimal separator', () => {
    expect(parseAmountInput('48.65.2', 'en')).toBeNull();
  });

  it('rejects a stray decimal-like character left over after normalizing', () => {
    // Two vi decimal commas: neither grouping-strip nor the comma->dot swap
    // can tell which one was meant, so this is rejected rather than guessed.
    expect(parseAmountInput('48,65,2', 'vi')).toBeNull();
  });

  it('rejects more than 4 decimal places', () => {
    expect(parseAmountInput('48.65432', 'en')).toBeNull();
  });

  it('accepts exactly 4 decimal places', () => {
    expect(parseAmountInput('48.6543', 'en')).toBe('48.6543');
  });

  it('strips leading zeros from the integer part', () => {
    expect(parseAmountInput('007.5', 'en')).toBe('7.5');
  });

  it('treats a leading decimal separator as a zero integer part', () => {
    expect(parseAmountInput('.5', 'en')).toBe('0.5');
  });

  it('rejects zero', () => {
    expect(parseAmountInput('0', 'en')).toBeNull();
  });

  it('rejects zero with trailing decimal zeros', () => {
    expect(parseAmountInput('0.00', 'en')).toBeNull();
  });

  it('rejects a value whose significant digits exceed 16 integer digits', () => {
    expect(parseAmountInput('123456789012345678', 'en')).toBeNull();
  });

  it('accepts exactly 16 integer digits', () => {
    expect(parseAmountInput('1234567890123456', 'en')).toBe('1234567890123456');
  });

  it('accepts more than 16 raw digits when leading zeros bring it within the cap', () => {
    expect(parseAmountInput('00000000000000123456', 'en')).toBe('123456');
  });

  it('rejects non-numeric input', () => {
    expect(parseAmountInput('abc', 'en')).toBeNull();
  });

  it('rejects a negative amount', () => {
    expect(parseAmountInput('-48.65', 'en')).toBeNull();
  });
});

describe('formatExpenseAmount', () => {
  it('formats an API decimal string as a display amount in en', () => {
    expect(
      formatExpenseAmount('45000.0000', 'VND', 'en').replace(/\s/g, ' '),
    ).toBe('₫45,000');
  });

  it('formats a fractional decimal string in en', () => {
    expect(formatExpenseAmount('7.2000', 'USD', 'en')).toBe('$7.20');
  });

  it('formats the same fractional amount in vi', () => {
    expect(formatExpenseAmount('7.2000', 'USD', 'vi').replace(/\s/g, ' ')).toBe(
      '7,20 US$',
    );
  });
});
