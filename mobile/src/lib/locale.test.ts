import { localeDisplayName, resolveSignupLocale } from './locale';

describe('resolveSignupLocale', () => {
  it('maps an exact "vi" language code to vi', () => {
    expect(resolveSignupLocale(['vi'])).toBe('vi');
  });

  it('maps a regioned Vietnamese tag to vi', () => {
    expect(resolveSignupLocale(['vi-VN'])).toBe('vi');
  });

  it('is case-insensitive', () => {
    expect(resolveSignupLocale(['VI'])).toBe('vi');
  });

  it('maps English to en', () => {
    expect(resolveSignupLocale(['en-US'])).toBe('en');
  });

  it('defaults an unsupported language to en', () => {
    expect(resolveSignupLocale(['fr-FR'])).toBe('en');
  });

  it('defaults an empty list to en', () => {
    expect(resolveSignupLocale([])).toBe('en');
  });

  it('skips a leading null/undefined and uses the next candidate', () => {
    expect(resolveSignupLocale([null, undefined, 'vi'])).toBe('vi');
  });

  it('defaults to en when every candidate is null', () => {
    expect(resolveSignupLocale([null, undefined])).toBe('en');
  });

  it('only looks at the first real candidate, per device language priority', () => {
    expect(resolveSignupLocale(['en-US', 'vi'])).toBe('en');
  });
});

describe('localeDisplayName', () => {
  it('labels en as English', () => {
    expect(localeDisplayName('en')).toBe('English');
  });

  it('labels vi as Tiếng Việt', () => {
    expect(localeDisplayName('vi')).toBe('Tiếng Việt');
  });
});
