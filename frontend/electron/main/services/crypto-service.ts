import { createCipheriv, createDecipheriv, pbkdf2Sync, randomBytes } from 'node:crypto'

const ITERATIONS = 210000
const KEY_LENGTH = 32
const DIGEST = 'sha256'

export interface EncryptedPayload {
  version: 1
  kdf: 'pbkdf2-sha256'
  salt: string
  iv: string
  ciphertext: string
  tag: string
}

const deriveKey = (masterPassword: string, salt: Buffer) => pbkdf2Sync(masterPassword, salt, ITERATIONS, KEY_LENGTH, DIGEST)

export const encryptVault = (masterPassword: string, plainText: string): EncryptedPayload => {
  const salt = randomBytes(16)
  const iv = randomBytes(12)
  const key = deriveKey(masterPassword, salt)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()])
  return {
    version: 1,
    kdf: 'pbkdf2-sha256',
    salt: salt.toString('base64'),
    iv: iv.toString('base64'),
    ciphertext: encrypted.toString('base64'),
    tag: cipher.getAuthTag().toString('base64')
  }
}

export const decryptVault = (masterPassword: string, payload: EncryptedPayload): string => {
  const key = deriveKey(masterPassword, Buffer.from(payload.salt, 'base64'))
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(payload.iv, 'base64'))
  decipher.setAuthTag(Buffer.from(payload.tag, 'base64'))
  const plain = Buffer.concat([
    decipher.update(Buffer.from(payload.ciphertext, 'base64')),
    decipher.final()
  ])
  return plain.toString('utf8')
}
