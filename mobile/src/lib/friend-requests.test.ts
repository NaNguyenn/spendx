import type { FriendRequestDto } from '@/api/friends';

import { otherParty } from './friend-requests';

const request: FriendRequestDto = {
  id: 'req-1',
  sender: { id: 'u-1', username: 'duykhanh', displayName: 'Duy Khánh' },
  recipient: { id: 'u-2', username: 'minhtran', displayName: 'Minh Trần' },
  createdAt: '2026-08-10T00:00:00.000Z',
};

describe('otherParty', () => {
  it('returns the sender for an incoming request', () => {
    expect(otherParty(request, 'incoming')).toEqual(request.sender);
  });

  it('returns the recipient for an outgoing request', () => {
    expect(otherParty(request, 'outgoing')).toEqual(request.recipient);
  });
});
