import type { FeedItemDto, FeedPageDto } from '@/api/feed';

import {
  appendFeedPage,
  dedupeFeedItems,
  resetFeedState,
  type FeedLoadState,
} from './feed';

function feedItem(overrides: Partial<FeedItemDto> = {}): FeedItemDto {
  return {
    id: 'e-1',
    description: 'Coffee with a friend',
    originalAmount: '45000.0000',
    originalCurrency: 'VND',
    convertedAmount: '45000.0000',
    convertedCurrency: 'VND',
    category: 'food',
    visibility: 'public',
    expenseDate: '2026-08-01',
    loggedAt: '2026-08-01T03:00:00.000Z',
    owner: { username: 'hnam', displayName: 'Hoàng Nam' },
    ...overrides,
  };
}

function page(items: FeedItemDto[], nextCursor: string | null): FeedPageDto {
  return { items, nextCursor };
}

describe('dedupeFeedItems', () => {
  it('returns items unchanged when every id is unique', () => {
    const items = [feedItem({ id: 'e-1' }), feedItem({ id: 'e-2' })];
    expect(dedupeFeedItems(items)).toEqual(items);
  });

  it('drops a later duplicate, keeping the earlier occurrence', () => {
    const first = feedItem({ id: 'e-1', description: 'First seen' });
    const duplicate = feedItem({ id: 'e-1', description: 'Later duplicate' });
    const items = [first, feedItem({ id: 'e-2' }), duplicate];

    const result = dedupeFeedItems(items);

    expect(result).toHaveLength(2);
    expect(result[0]).toBe(first);
  });

  it('is empty for an empty input', () => {
    expect(dedupeFeedItems([])).toEqual([]);
  });
});

describe('resetFeedState', () => {
  it('starts fresh from a first page, discarding anything already loaded', () => {
    const firstPage = page(
      [feedItem({ id: 'e-1' }), feedItem({ id: 'e-2' })],
      'cursor-2',
    );

    const state = resetFeedState(firstPage);

    expect(state).toEqual<FeedLoadState>({
      items: [feedItem({ id: 'e-1' }), feedItem({ id: 'e-2' })],
      nextCursor: 'cursor-2',
    });
  });

  it('dedupes even within a single page (defensive, not expected from the API)', () => {
    const firstPage = page(
      [feedItem({ id: 'e-1' }), feedItem({ id: 'e-1' })],
      null,
    );

    expect(resetFeedState(firstPage).items).toHaveLength(1);
  });

  it('carries a null nextCursor through when the first page is also the last', () => {
    const firstPage = page([feedItem({ id: 'e-1' })], null);
    expect(resetFeedState(firstPage).nextCursor).toBeNull();
  });
});

describe('appendFeedPage', () => {
  it('appends a new page after already-loaded items, in order', () => {
    const state = resetFeedState(
      page([feedItem({ id: 'e-1' }), feedItem({ id: 'e-2' })], 'cursor-2'),
    );

    const next = appendFeedPage(
      state,
      page([feedItem({ id: 'e-3' }), feedItem({ id: 'e-4' })], 'cursor-4'),
    );

    expect(next.items.map((item) => item.id)).toEqual([
      'e-1',
      'e-2',
      'e-3',
      'e-4',
    ]);
    expect(next.nextCursor).toBe('cursor-4');
  });

  it("replaces nextCursor with the new page's own, including null once exhausted", () => {
    const state = resetFeedState(page([feedItem({ id: 'e-1' })], 'cursor-2'));

    const next = appendFeedPage(state, page([feedItem({ id: 'e-2' })], null));

    expect(next.nextCursor).toBeNull();
  });

  it('dedupes across pages — keyset pagination should never repeat an id, but this guards defensively anyway', () => {
    const state = resetFeedState(
      page([feedItem({ id: 'e-1' }), feedItem({ id: 'e-2' })], 'cursor-2'),
    );

    const next = appendFeedPage(
      state,
      page([feedItem({ id: 'e-2' }), feedItem({ id: 'e-3' })], null),
    );

    expect(next.items.map((item) => item.id)).toEqual(['e-1', 'e-2', 'e-3']);
  });

  it('is a no-op append when the new page is empty', () => {
    const state = resetFeedState(page([feedItem({ id: 'e-1' })], 'cursor-2'));

    const next = appendFeedPage(state, page([], null));

    expect(next.items.map((item) => item.id)).toEqual(['e-1']);
    expect(next.nextCursor).toBeNull();
  });
});
