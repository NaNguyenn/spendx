import { isValidOneTimeCode } from './one-time-code';

describe('isValidOneTimeCode', () => {
  it('accepts exactly 6 digits', () => {
    expect(isValidOneTimeCode('123456')).toBe(true);
  });

  it('rejects fewer than 6 digits', () => {
    expect(isValidOneTimeCode('12345')).toBe(false);
  });

  it('rejects more than 6 digits', () => {
    expect(isValidOneTimeCode('1234567')).toBe(false);
  });

  it('rejects non-digit characters', () => {
    expect(isValidOneTimeCode('12a456')).toBe(false);
  });

  it('rejects an empty string', () => {
    expect(isValidOneTimeCode('')).toBe(false);
  });

  it('rejects whitespace padding', () => {
    expect(isValidOneTimeCode(' 123456')).toBe(false);
    expect(isValidOneTimeCode('123456 ')).toBe(false);
  });
});
