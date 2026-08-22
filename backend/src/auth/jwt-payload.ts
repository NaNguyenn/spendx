/**
 * The shape signed into every access token. Deliberately minimal: a token is
 * not a place to publish account data (email, Username), because claims there
 * go stale the moment the account changes. Anything else about the caller is
 * looked up fresh from `sub`.
 */
export interface JwtPayload {
  sub: string;
  /**
   * Issued-at, in whole seconds — stamped automatically by the JWT library
   * on every sign, so it appears here without ever being passed to
   * `signAsync`. Read by `JwtAuthGuard` against `User.credentialsChangedAt`
   * (docs/adr/0010) to revoke sessions issued before a credential change.
   */
  iat: number;
}
