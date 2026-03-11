import crypto from 'crypto';

const SALT = 'crates-crm-v1';

export function hashPassword(password) {
  return crypto.scryptSync(password, SALT, 64).toString('hex');
}

export function verifyPassword(password, hash) {
  return hashPassword(password) === hash;
}
