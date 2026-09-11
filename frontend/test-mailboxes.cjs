const fs = require('node:fs')
const assert = require('node:assert/strict')
const { test } = require('node:test')
const ts = require('typescript')
require.extensions['.ts'] = (module, filename) => {
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  })
  module._compile(outputText, filename)
}
const { createPinia, setActivePinia } = require('pinia')
const { useVaultStore } = require('./src/renderer/stores/vault.ts')
const { normalizeMailbox } = require('./src/renderer/utils/mailbox.ts')
const email = { username: 'demo@example.com', password: '  www.example.com  ', url: 'mail.example.com' }
const account = { username: 'demo@example.com', password: 'site-password', note: '', isDefault: false }
const setup = () => {
  setActivePinia(createPinia())
  const saves = []
  global.window = { desktopApi: { vault: { saveData: async (data) => { saves.push(data); return { success: true } } } } }
  const vault = useVaultStore()
  vault.setData({ version: 1, settings: {}, websites: ['a', 'b'].map((id) => ({ id, name: id, url: '', category: '个人', tags: [], note: '', createdAt: '', updatedAt: '', accounts: [] })) })
  return { vault, saves }
}
test('legacy vault: account and new mailbox save together and survive reload', async () => {
  const { vault, saves } = setup()
  assert.equal(vault.mailboxes.length, 0)
  await vault.upsertAccount('a', { ...account, newMailbox: email })
  assert.equal(saves.length, 1)
  assert.equal(vault.websites[0].accounts[0].mailboxId, vault.mailboxes[0].id)
  assert.equal(vault.mailboxes[0].password, email.password)
  assert.equal(vault.mailboxes[0].url, 'https://mail.example.com/')
  assert.equal('newMailbox' in saves[0].websites[0].accounts[0], false)
  vault.setData(JSON.parse(JSON.stringify(saves[0])))
  assert.equal(vault.mailboxes.length, 1)
})
test('shared edits, linked deletion protection, unlinking and independent lifetime', async () => {
  const { vault } = setup()
  await vault.upsertAccount('a', { ...account, newMailbox: email })
  const id = vault.mailboxes[0].id
  await vault.upsertAccount('b', { ...account, mailboxId: id })
  await vault.upsertMailbox({ ...email, password: 'changed' }, id)
  assert.equal(vault.mailboxes.length, 1)
  assert.ok(vault.websites.every((w) => w.accounts[0].mailboxId === id))
  assert.equal(vault.mailboxes[0].password, 'changed')
  await assert.rejects(vault.deleteMailbox(id), /关联账号/)
  await vault.upsertAccount('a', { ...account, mailboxId: '' }, vault.websites[0].accounts[0].id)
  assert.equal(vault.mailboxes.length, 1)
  await vault.deleteWebsite('b')
  await vault.deleteMailbox(id)
  assert.equal(vault.mailboxes.length, 0)
})
test('failed write leaves both account and mailbox unchanged', async () => {
  const { vault } = setup()
  global.window.desktopApi.vault.saveData = async () => ({ success: false, error: 'disk full' })
  await assert.rejects(vault.upsertAccount('a', { ...account, newMailbox: email }), /disk full/)
  assert.equal(vault.mailboxes.length, 0)
  assert.equal(vault.websites[0].accounts.length, 0)
})
test('duplicates and missing references cannot overwrite credentials', async () => {
  const { vault, saves } = setup()
  await vault.upsertMailbox(email)
  await assert.rejects(vault.upsertAccount('a', { ...account, newMailbox: { ...email, username: 'DEMO@example.com' } }), /已保存/)
  await assert.rejects(vault.upsertAccount('a', { ...account, mailboxId: 'missing' }), /不存在/)
  assert.equal(saves.length, 1)
  assert.equal(vault.mailboxes[0].password, email.password)
})
test('URL and email validation preserves password exactly', () => {
  assert.equal(normalizeMailbox(email).password, email.password)
  for (const url of ['javascript:alert(1)', 'file:///tmp/mail', 'https://user:password@example.com', 'not a website']) {
    assert.throws(() => normalizeMailbox({ ...email, url }), /网页登录地址/)
  }
  assert.throws(() => normalizeMailbox({ ...email, username: 'mail.com' }), /完整的邮箱账号/)
})
