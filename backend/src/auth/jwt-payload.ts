/**
 * The shape signed into every access token. Deliberately minimal: a token is
 * not a place to publish account data (email, Username), because claims there
 * go stale the moment the account changes. Anything else about the caller is
 * looked up fresh from `sub`.
 */
export interface JwtPayload {
  sub: string;
}
