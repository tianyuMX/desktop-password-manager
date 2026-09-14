/**
 * 加密服务（主进程）
 *
 * 密码库的加密核心：使用 PBKDF2-SHA256 从主密码派生 256 位密钥，
 * 再用 AES-256-GCM 对整个密码库明文进行认证加密。
 * GCM 模式自带完整性校验（tag），密钥错误或数据被篡改时解密会直接失败。
 */
import { createCipheriv, createDecipheriv, pbkdf2Sync, randomBytes } from 'node:crypto'

// PBKDF2 迭代次数（OWASP 2023 建议的最低值），越大越抗暴力破解
const ITERATIONS = 210000
// 派生密钥长度：32 字节 = 256 位，对应 AES-256
const KEY_LENGTH = 32
// PBKDF2 摘要算法
const DIGEST = 'sha256'

/** 密码库落盘的加密载荷结构（JSON 序列化后写入 vault.dat） */
export interface EncryptedPayload {
  /** 载荷格式版本号，便于将来升级数据格式 */
  version: 1
  /** 密钥派生算法标识，解密前可用于识别格式 */
  kdf: 'pbkdf2-sha256'
  /** PBKDF2 盐值（base64），每次加密随机生成 */
  salt: string
  /** GCM 初始向量（base64），12 字节 */
  iv: string
  /** 密文（base64） */
  ciphertext: string
  /** GCM 认证标签（base64），用于校验密文完整性 */
  tag: string
}

/** 用主密码 + 盐值派生 AES 密钥（同步计算，代价约为几百毫秒） */
const deriveKey = (masterPassword: string, salt: Buffer) => pbkdf2Sync(masterPassword, salt, ITERATIONS, KEY_LENGTH, DIGEST)

/** 加密：明文 → 加密载荷（每次加密都使用新的盐和 IV） */
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
