import { initials } from './initials';

describe('initials', () => {
  it('takes the first letter of the first two words', () => {
    expect(initials('Minh Trần')).toBe('MT');
  });

  it('takes a single letter for a one-word name', () => {
    expect(initials('Duy')).toBe('D');
  });

  it('ignores a third and later word', () => {
    expect(initials('Lan Anh Nguyễn')).toBe('LA');
  });

  it('collapses repeated whitespace between words', () => {
    expect(initials('  Thu   Hà  ')).toBe('TH');
  });

  it('returns an empty string for an empty name', () => {
    expect(initials('')).toBe('');
  });
});
