import { toggleLike, type Likeable } from './likes';

function item(overrides: Partial<Likeable> = {}): Likeable {
  return { id: 'e-1', likeCount: 3, likedByViewer: false, ...overrides };
}

describe('toggleLike', () => {
  it('likes an unliked item: flips likedByViewer and increments likeCount', () => {
    const items = [item({ id: 'e-1', likeCount: 3, likedByViewer: false })];

    const result = toggleLike(items, 'e-1');

    expect(result[0]).toEqual({ id: 'e-1', likeCount: 4, likedByViewer: true });
  });

  it('unlikes a liked item: flips likedByViewer and decrements likeCount', () => {
    const items = [item({ id: 'e-1', likeCount: 3, likedByViewer: true })];

    const result = toggleLike(items, 'e-1');

    expect(result[0]).toEqual({
      id: 'e-1',
      likeCount: 2,
      likedByViewer: false,
    });
  });

  it('never takes likeCount below 0 when unliking a 0-count item', () => {
    const items = [item({ id: 'e-1', likeCount: 0, likedByViewer: true })];

    const result = toggleLike(items, 'e-1');

    expect(result[0]).toEqual({
      id: 'e-1',
      likeCount: 0,
      likedByViewer: false,
    });
  });

  it('is its own inverse: toggling twice returns to the original values', () => {
    const original = item({ id: 'e-1', likeCount: 3, likedByViewer: false });

    const result = toggleLike(toggleLike([original], 'e-1'), 'e-1');

    expect(result[0]).toEqual(original);
  });

  it('leaves every other item reference-equal — memo-friendly', () => {
    const other = item({ id: 'e-2', likeCount: 1, likedByViewer: false });
    const items = [item({ id: 'e-1' }), other];

    const result = toggleLike(items, 'e-1');

    expect(result[1]).toBe(other);
  });

  it('is a no-op array copy when the id has no match', () => {
    const items = [item({ id: 'e-1' }), item({ id: 'e-2' })];

    const result = toggleLike(items, 'e-does-not-exist');

    expect(result).toEqual(items);
    expect(result[0]).toBe(items[0]);
    expect(result[1]).toBe(items[1]);
  });

  it('is empty for an empty input', () => {
    expect(toggleLike([], 'e-1')).toEqual([]);
  });
});
