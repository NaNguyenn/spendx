import { Injectable } from '@nestjs/common';
import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from 'node:crypto';
import { promisify } from 'node:util';
import type { PasswordHasher } from './password-hasher';

const scrypt = promisify(scryptCallback) as (
  password: string,
  salt: Buffer,
  keylen: number,
  options: { N: number; r: number; p: number },
) => Promise<Buffer>;

// N (CPU/memory cost) = 2^14, the value Node's own crypto.scrypt example
// uses. Memory required is 128 * N * r bytes = 16MiB, comfortably under
// node:crypto's default 32MiB maxmem, so no maxmem override is needed.
const COST = 16_384;
const BLOCK_SIZE = 8;
const PARALLELIZATION = 1;
const SALT_BYTES = 16;
const KEY_LENGTH = 64;

/**
 * Password hashing with node's built-in `scrypt` — no native dependency, so
 * none of the npm-11 install-script approval dance the repo's other native
 * deps need (see README "Gotchas"), and no 72-byte silent truncation the way
 * bcrypt has.
 *
 * The stored string carries its own cost parameters and salt
 * (`scrypt$N$r$p$<salt>$<hash>`), so a future cost bump doesn't invalidate
 * hashes issued under the old one.
 */
@Injectable()
export class ScryptPasswordHasher implements PasswordHasher {
  async hash(password: string): Promise<string> {
    const salt = randomBytes(SALT_BYTES);
    const derivedKey = await scrypt(password, salt, KEY_LENGTH, {
      N: COST,
      r: BLOCK_SIZE,
      p: PARALLELIZATION,
    });

    return [
      'scrypt',
      COST,
      BLOCK_SIZE,
      PARALLELIZATION,
      salt.toString('base64'),
      derivedKey.toString('base64'),
    ].join('$');
  }

  async verify(password: string, storedHash: string): Promise<boolean> {
    const parsed = parseStoredHash(storedHash);
    if (!parsed) return false;

    const { N, r, p, salt, hash } = parsed;
    const derivedKey = await scrypt(password, salt, hash.length, { N, r, p });

    // timingSafeEqual throws on a length mismatch rather than returning
    // false, so guard it explicitly first.
    return (
      derivedKey.length === hash.length && timingSafeEqual(derivedKey, hash)
    );
  }
}

interface ParsedHash {
  N: number;
  r: number;
  p: number;
  salt: Buffer;
  hash: Buffer;
}

function parseStoredHash(storedHash: string): ParsedHash | null {
  const parts = storedHash.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return null;

  const [, nRaw, rRaw, pRaw, saltB64, hashB64] = parts;
  const N = Number(nRaw);
  const r = Number(rRaw);
  const p = Number(pRaw);
  if (![N, r, p].every(Number.isInteger)) return null;

  return {
    N,
    r,
    p,
    salt: Buffer.from(saltB64, 'base64'),
    hash: Buffer.from(hashB64, 'base64'),
  };
}
