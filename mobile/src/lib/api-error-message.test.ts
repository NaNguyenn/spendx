import { ApiError } from '@/api/client';

import { classifySignUpError, getErrorMessage } from './api-error-message';

describe('getErrorMessage', () => {
  it('returns the string message from an ApiError body, untranslated', () => {
    const error = new ApiError(401, {
      statusCode: 401,
      message: 'Invalid email or password',
    });

    expect(getErrorMessage(error)).toEqual({
      kind: 'server',
      text: 'Invalid email or password',
    });
  });

  it('joins a class-validator array of messages into one line', () => {
    const error = new ApiError(400, {
      statusCode: 400,
      message: [
        'email must be an email',
        'password must be longer than 8 characters',
      ],
    });

    expect(getErrorMessage(error)).toEqual({
      kind: 'server',
      text: 'email must be an email password must be longer than 8 characters',
    });
  });

  it('falls back to the generic key when the body has no message', () => {
    const error = new ApiError(500, { statusCode: 500 });

    expect(getErrorMessage(error)).toEqual({
      kind: 'key',
      key: 'apiError.generic',
    });
  });

  it('falls back to the generic key when the body is not JSON', () => {
    const error = new ApiError(500, 'Internal Server Error');

    expect(getErrorMessage(error)).toEqual({
      kind: 'key',
      key: 'apiError.generic',
    });
  });

  it('reports the network key for a TypeError, what fetch rejects with when unreachable', () => {
    expect(getErrorMessage(new TypeError('Network request failed'))).toEqual({
      kind: 'key',
      key: 'apiError.network',
    });
  });

  it('falls back to the generic key for anything else', () => {
    expect(getErrorMessage('nope')).toEqual({
      kind: 'key',
      key: 'apiError.generic',
    });
  });
});

describe('classifySignUpError', () => {
  it('classifies the email conflict message', () => {
    expect(classifySignUpError('Email already registered')).toBe('email');
  });

  it('classifies the username conflict message', () => {
    expect(classifySignUpError('Username already taken')).toBe('username');
  });

  it('is case-insensitive', () => {
    expect(classifySignUpError('EMAIL ALREADY REGISTERED')).toBe('email');
  });

  it('falls back to general for anything not naming a field', () => {
    expect(classifySignUpError('Something went wrong')).toBe('general');
  });
});
