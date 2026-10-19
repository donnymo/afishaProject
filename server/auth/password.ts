import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from 'node:crypto';

/**
 * Пароли храним только как scrypt-хеш (memory-hard KDF из node:crypto)
 * со случайной солью. Формат: scrypt$N$r$p$соль$хеш, параметры лежат
 * рядом с хешем, поэтому их можно усилить без миграции старых записей.
 */
const N = 2 ** 15;
const R = 8;
const P = 1;
const KEY_LEN = 64;
const SALT_LEN = 16;

function derive(password: string, salt: Buffer, opts: ScryptOptions, keyLen: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password.normalize('NFKC'), salt, keyLen, { ...opts, maxmem: 256 * 1024 * 1024 }, (err, key) =>
      err ? reject(err) : resolve(key),
    );
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LEN);
  const key = await derive(password, salt, { N, r: R, p: P }, KEY_LEN);
  return ['scrypt', N, R, P, salt.toString('base64'), key.toString('base64')].join('$');
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algo, n, r, p, saltB64, keyB64] = stored.split('$');
  if (algo !== 'scrypt' || !saltB64 || !keyB64) return false;
  const expected = Buffer.from(keyB64, 'base64');
  const actual = await derive(
    password,
    Buffer.from(saltB64, 'base64'),
    { N: Number(n), r: Number(r), p: Number(p) },
    expected.length,
  );
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/** Хеш для выравнивания времени ответа, когда пользователя с таким email нет. */
export const DUMMY_HASH = 'scrypt$32768$8$1$AAAAAAAAAAAAAAAAAAAAAA==$' + Buffer.alloc(KEY_LEN).toString('base64');
