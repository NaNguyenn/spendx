/**
 * Canonically orders two User ids for the Friendship table's invariant
 * (`userAId < userBId` — see schema.prisma), so every method that reads or
 * writes a Friendship can pass ids in either order and still land on the
 * one row an unordered pair of Users owns.
 */
export function orderedFriendPair(idA: string, idB: string): [string, string] {
  return idA < idB ? [idA, idB] : [idB, idA];
}
