// Encryption and decryption module using AES-256-CBC
// Used to protect vault passwords before storing them in the database
// Even if the database is compromised, passwords remain unreadable without the key

const crypto = require('crypto');

// AES-256-CBC: 256-bit key length, CBC (Cipher Block Chaining) mode
const ALGORITHM = 'aes-256-cbc';

// Derive a fixed 32-byte encryption key from a secret passphrase using scrypt
// scrypt is a secure key derivation function designed to be slow against brute force attacks
const KEY = crypto.scryptSync(process.env.ENCRYPTION_SECRET || 'syfer-secret-key-change-in-prod', 'salt', 32);

// Encrypts a plain text password and returns the encrypted value plus the IV
function encrypt(plaintext) {
  // Generate a random 16-byte IV (initialization vector) for each encryption
  // This ensures the same password produces a different encrypted result every time
  const iv = crypto.randomBytes(16);

  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);

  // Encrypt the plaintext and combine the output chunks into one buffer
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);

  return {
    iv: iv.toString('hex'),                          // Stored in the database alongside the password
    encrypted_password: encrypted.toString('hex'),   // The unreadable encrypted value
  };
}

// Decrypts an encrypted password back to plain text using the stored IV
function decrypt(encryptedHex, ivHex) {
  const iv = Buffer.from(ivHex, 'hex');
  const encryptedBuffer = Buffer.from(encryptedHex, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);

  // Reverse the encryption to recover the original password
  const decrypted = Buffer.concat([decipher.update(encryptedBuffer), decipher.final()]);
  return decrypted.toString('utf8');
}

module.exports = { encrypt, decrypt };
