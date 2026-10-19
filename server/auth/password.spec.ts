import { DUMMY_HASH, hashPassword, verifyPassword } from './password.js';

describe('password', () => {
  it('хеширует с солью и проверяет', async () => {
    const a = await hashPassword('correct horse');
    const b = await hashPassword('correct horse');
    expect(a).not.toBe(b);
    expect(await verifyPassword('correct horse', a)).toBe(true);
    expect(await verifyPassword('wrong horse', a)).toBe(false);
  });

  it('не принимает пароль против заглушки и мусора', async () => {
    expect(await verifyPassword('', DUMMY_HASH)).toBe(false);
    expect(await verifyPassword('x', 'plain-text')).toBe(false);
  });
});
