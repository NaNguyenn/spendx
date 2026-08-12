import {
  isValidDisplayName,
  isValidEmail,
  isValidPassword,
  isValidUsername,
  normalizeEmail,
  normalizeUsername,
  validateSignUpForm,
} from './validation';

describe('isValidEmail', () => {
  it('accepts a plausible address', () => {
    expect(isValidEmail('minh@spendx.app')).toBe(true);
  });

  it('trims surrounding whitespace before checking', () => {
    expect(isValidEmail('  minh@spendx.app  ')).toBe(true);
  });

  it('rejects a value with no @', () => {
    expect(isValidEmail('minh.spendx.app')).toBe(false);
  });

  it('rejects a value with no domain', () => {
    expect(isValidEmail('minh@')).toBe(false);
  });

  it('rejects a value with no TLD', () => {
    expect(isValidEmail('minh@spendx')).toBe(false);
  });

  it('rejects a value containing whitespace', () => {
    expect(isValidEmail('minh tran@spendx.app')).toBe(false);
  });
});

describe('isValidPassword', () => {
  it('rejects 7 characters, one under the minimum', () => {
    expect(isValidPassword('1234567')).toBe(false);
  });

  it('accepts exactly 8 characters', () => {
    expect(isValidPassword('12345678')).toBe(true);
  });

  it('accepts exactly 128 characters', () => {
    expect(isValidPassword('a'.repeat(128))).toBe(true);
  });

  it('rejects 129 characters, one over the maximum', () => {
    expect(isValidPassword('a'.repeat(129))).toBe(false);
  });
});

describe('isValidUsername', () => {
  it('rejects 2 characters, one under the minimum', () => {
    expect(isValidUsername('ab')).toBe(false);
  });

  it('accepts exactly 3 characters', () => {
    expect(isValidUsername('abc')).toBe(true);
  });

  it('accepts exactly 30 characters', () => {
    expect(isValidUsername('a'.repeat(30))).toBe(true);
  });

  it('rejects 31 characters, one over the maximum', () => {
    expect(isValidUsername('a'.repeat(31))).toBe(false);
  });

  it('accepts lowercase letters, digits and underscore', () => {
    expect(isValidUsername('minh_tran_92')).toBe(true);
  });

  it('accepts uppercase input, since it is compared lowercased', () => {
    expect(isValidUsername('MinhTran')).toBe(true);
  });

  it('rejects a hyphen, which is outside the pattern', () => {
    expect(isValidUsername('minh-tran')).toBe(false);
  });

  it('rejects a space', () => {
    expect(isValidUsername('minh tran')).toBe(false);
  });

  it('trims surrounding whitespace before checking length', () => {
    expect(isValidUsername('  ab  ')).toBe(false);
    expect(isValidUsername('  abc  ')).toBe(true);
  });
});

describe('isValidDisplayName', () => {
  it('rejects an empty string', () => {
    expect(isValidDisplayName('')).toBe(false);
  });

  it('rejects a string that is only whitespace', () => {
    expect(isValidDisplayName('   ')).toBe(false);
  });

  it('accepts exactly 1 character after trimming', () => {
    expect(isValidDisplayName('  M  ')).toBe(true);
  });

  it('accepts exactly 50 characters after trimming', () => {
    expect(isValidDisplayName('a'.repeat(50))).toBe(true);
  });

  it('rejects 51 characters after trimming, one over the maximum', () => {
    expect(isValidDisplayName('a'.repeat(51))).toBe(false);
  });

  it('measures the length after trimming, not before', () => {
    // 50 real characters plus padding that must not count against the limit.
    expect(isValidDisplayName(`  ${'a'.repeat(50)}  `)).toBe(true);
  });
});

describe('normalizeEmail', () => {
  it('trims and lowercases', () => {
    expect(normalizeEmail('  Minh@Spendx.App  ')).toBe('minh@spendx.app');
  });
});

describe('normalizeUsername', () => {
  it('trims and lowercases', () => {
    expect(normalizeUsername('  MinhTran  ')).toBe('minhtran');
  });
});

describe('validateSignUpForm', () => {
  const validValues = {
    displayName: 'Minh Trần',
    username: 'minhtran',
    email: 'minh@spendx.app',
    password: 'correct horse battery',
  };

  it('returns no errors for a fully valid form', () => {
    expect(validateSignUpForm(validValues)).toEqual({});
  });

  it('reports every invalid field at once', () => {
    const errors = validateSignUpForm({
      displayName: '',
      username: 'ab',
      email: 'not-an-email',
      password: 'short',
    });

    expect(Object.keys(errors).sort()).toEqual([
      'displayName',
      'email',
      'password',
      'username',
    ]);
  });

  it('reports only the invalid field when the rest are valid', () => {
    const errors = validateSignUpForm({
      ...validValues,
      email: 'not-an-email',
    });

    expect(errors).toEqual({ email: 'validation.email' });
  });

  it('returns the translation key for each field, not a message', () => {
    const errors = validateSignUpForm({
      displayName: '',
      username: 'ab',
      email: 'not-an-email',
      password: 'short',
    });

    expect(errors).toEqual({
      displayName: 'validation.displayName',
      username: 'validation.username',
      email: 'validation.email',
      password: 'validation.password',
    });
  });
});
