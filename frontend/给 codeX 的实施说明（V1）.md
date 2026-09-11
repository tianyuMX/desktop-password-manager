# 给 codeX 的实施说明（V1）

## 1. 目标

基于 **Electron + Vue 3 + Vite** 开发一个 **纯本地、离线、单用户、无后端** 的桌面密码管理器 V1。

V1 只做最小闭环：

- 首次创建主密码
- 启动先解锁
- 按分类管理网站
- 每个网站下管理多个账号密码
- 点击网站地址跳转系统默认浏览器
- 本地加密保存
- 支持手动锁定与自动锁定
- 提供基础设置项

## 2. 本次实现范围

### 2.1 要做

1. 初始化密码库
2. 主密码解锁
3. 本地加密读写
4. 分类侧边栏
5. 网站列表与详情
6. 网站 CRUD
7. 网站下账号 CRUD
8. 搜索
9. 打开网站
10. 复制用户名/密码
11. 密码显示/隐藏
12. 手动锁定
13. 自动锁定
14. 设置页
15. 修改主密码

### 2.2 不做

1. 收藏功能
2. 云同步
3. 团队共享
4. 浏览器插件
5. 自动填充
6. 多密码库
7. 附件
8. 二步验证
9. 导入浏览器密码
10. 托盘高级功能
11. 密码历史版本
12. 自定义分类管理页面
13. 主题与多语言

说明：**收藏功能明确不进入 V1。** 页面、数据结构、状态管理中都不要预留收藏逻辑。

------

## 3. 技术选型建议

### 3.1 固定技术栈

- Electron
- Vue 3
- Vite
- TypeScript
- Pinia
- Vue Router

### 3.2 UI 建议

UI 框架可自由选型，但 V1 不要求重度设计系统。

建议：

- 原生 CSS / SCSS
- 或轻量组件库

要求：

- 页面简单清晰
- 优先功能正确
- 不要为了 UI 框架引入复杂依赖

### 3.3 数据存储建议

- 密码库保存在本地应用数据目录
- 使用单个 vault 文件保存业务数据
- 落盘必须是密文
- 不允许将密码明文写入本地 JSON 文件

------

## 4. 核心架构原则

## 4.1 进程职责分离

### 主进程负责

1. 创建窗口
2. 管理应用生命周期
3. 文件读写
4. 密码库加密/解密
5. 打开外部网址
6. 系统级剪贴板清空调度（可选放 preload + renderer 协作）
7. 锁定事件分发

### preload 负责

1. 使用安全白名单方式暴露 API
2. 通过 contextBridge 暴露给渲染进程最小能力集
3. 不直接暴露 ipcRenderer 原始能力

### 渲染进程负责

1. 页面渲染
2. 用户交互
3. 本地状态管理
4. 表单校验
5. 调用 preload 暴露的受限 API

------

## 5. 安全边界要求

这一部分必须严格执行。

### 5.1 BrowserWindow 安全配置

创建主窗口时必须满足：

- `contextIsolation: true`
- `nodeIntegration: false`
- `sandbox: true`（如所选 Electron 方案兼容，建议开启）
- 使用 `preload` 注入桥接 API

### 5.2 禁止事项

禁止以下做法：

- 在渲染进程直接使用 Node API
- 在渲染进程直接访问 `fs`
- 在渲染进程直接访问原始 `ipcRenderer`
- 把整套 Electron API 挂到 `window`
- 把原始 shell 能力直接暴露给页面

### 5.3 允许暴露给渲染进程的 API 范围

只暴露业务最小集，例如：

- `vault.exists()`
- `vault.initialize(masterPassword)`
- `vault.unlock(masterPassword)`
- `vault.lock()`
- `vault.getData()`
- `vault.saveData(data)`
- `vault.changeMasterPassword(oldPwd, newPwd)`
- `app.openExternal(url)`
- `app.onAutoLock(callback)`
- `clipboard.copyText(text)`

说明：

- preload 暴露的是“受限业务 API”，不是底层 IPC
- 所有入参必须校验
- 所有返回值统一结构化

------

## 6. 推荐目录结构

```text
project/
  electron/
    main/
      index.ts
      window.ts
      ipc/
        vault.ts
        app.ts
        clipboard.ts
      services/
        vault-service.ts
        crypto-service.ts
        settings-service.ts
        external-service.ts
        lock-service.ts
      utils/
        path.ts
        validate.ts
        time.ts
    preload/
      index.ts
      types.d.ts
  src/
    renderer/
      main.ts
      App.vue
      router/
        index.ts
      stores/
        app.ts
        auth.ts
        vault.ts
        settings.ts
      views/
        InitializeView.vue
        UnlockView.vue
        MainLayout.vue
        SettingsView.vue
      components/
        layout/
          SidebarCategories.vue
          WebsiteList.vue
          WebsiteDetail.vue
        website/
          WebsiteFormDialog.vue
          WebsiteInfoCard.vue
        account/
          AccountList.vue
          AccountCard.vue
          AccountFormDialog.vue
        common/
          ConfirmDialog.vue
          EmptyState.vue
          SearchBar.vue
          Toast.vue
      composables/
        useLockTimer.ts
        useClipboard.ts
        useValidation.ts
      types/
        app.ts
        vault.ts
      utils/
        format.ts
        url.ts
        mapper.ts
  package.json
```

说明：

- `electron/` 放主进程和 preload 逻辑
- `src/renderer/` 放 Vue 前端逻辑
- 与密码库有关的读写、加解密尽量放主进程 service

------

## 7. 模块拆分建议

## 7.1 electron/main/services

### `vault-service.ts`

负责：

- 检查 vault 是否存在
- 初始化 vault
- 解锁 vault
- 锁定 vault
- 读取当前解锁数据
- 保存当前数据
- 修改主密码

### `crypto-service.ts`

负责：

- 密钥派生
- 加密
- 解密
- 主密码校验相关逻辑

要求：

- 不把密码学细节散落到多个文件
- 所有加解密统一在这里封装

### `settings-service.ts`

负责：

- 读取默认设置
- 保存用户设置
- 返回当前设置

### `external-service.ts`

负责：

- 校验网址
- 打开外部网址

### `lock-service.ts`

负责：

- 记录锁定状态
- 接收最小化和超时事件
- 向渲染层广播锁定事件

------

## 7.2 渲染层 store 建议

### `auth.ts`

负责：

- 当前是否已解锁
- 初始化状态
- 解锁动作
- 锁定动作
- 主密码修改动作

### `vault.ts`

负责：

- 当前密码库数据
- 网站列表
- 当前选中网站
- 网站与账号的增删改查
- 搜索与筛选后的派生数据

### `settings.ts`

负责：

- 自动锁定时间
- 最小化锁定
- 剪贴板清空时间
- 默认隐藏密码开关

### `app.ts`

负责：

- 全局对话框状态
- 全局 toast
- 当前路由级 UI 状态

------

## 8. 数据模型（V1 固化）

## 8.1 根对象

```ts
interface VaultRoot {
  version: 1
  settings: VaultSettings
  websites: Website[]
}
```

## 8.2 设置对象

```ts
interface VaultSettings {
  autoLockMinutes: number
  lockOnMinimize: boolean
  clearClipboard: boolean
  clearClipboardSeconds: number
  hidePasswordByDefault: boolean
}
```

## 8.3 网站对象

```ts
interface Website {
  id: string
  name: string
  url: string
  category: WebsiteCategory
  tags: string[]
  note: string
  createdAt: string
  updatedAt: string
  accounts: Account[]
}
```

## 8.4 账号对象

```ts
interface Account {
  id: string
  username: string
  password: string
  note: string
  isDefault: boolean
  createdAt: string
  updatedAt: string
}
```

## 8.5 分类枚举

```ts
type WebsiteCategory =
  | '工作'
  | '个人'
```

说明：

- 分类先固定写死，不做自定义分类管理
- 不要添加 `isFavorite`

------

## 9. 本地文件设计建议

## 9.1 文件位置

使用 Electron 应用数据目录保存，例如：

- `vault.dat`：加密后的密码库文件
- `meta.json`：可选，仅保存非敏感初始化元信息

建议：

- 优先简化成单个 vault 文件
- 元信息若非必要，不单独拆出

## 9.2 文件内容建议

推荐使用统一加密包装结构：

```json
{
  "version": 1,
  "kdf": "...",
  "salt": "...",
  "iv": "...",
  "ciphertext": "..."
}
```

说明：

- 真正业务 JSON 整体加密后放入 `ciphertext`
- 不在磁盘明文保存网站、账号、密码字段

## 9.3 内存态要求

- 仅在解锁后，内存中保留解密数据
- 锁定后清空内存态或重置 store
- 不要把主密码长期缓存在渲染层 store

------

## 10. 路由与页面组织

## 10.1 路由建议

```text
/
  -> 根据状态跳转
/initialize
/unlock
/app
/settings
```

### 路由守卫规则

- 未初始化只能进入 `/initialize`
- 已初始化未解锁只能进入 `/unlock`
- 已解锁可进入 `/app` 和 `/settings`
- 锁定后强制跳回 `/unlock`

------

## 11. 主界面布局要求

采用三栏布局：

### 左侧：分类栏

- 全部
- 工作
- 个人

功能：

- 点击切换分类过滤
- 显示当前选中状态

### 中间：网站列表

顶部：

- 搜索框
- 新增网站按钮
- 锁定按钮
- 设置按钮

列表项字段：

- 网站名称
- 分类
- 账号数量
- 更新时间

### 右侧：网站详情

区块 1：网站基础信息

- 名称
- 分类
- 标签
- 网站地址
- 备注
- 打开网站
- 复制网址
- 编辑网站
- 删除网站

区块 2：账号列表

每个账号卡片包含：

- 用户名
- 密码（默认隐藏）
- 默认账号标记
- 备注
- 显示/隐藏密码
- 复制用户名
- 复制密码
- 编辑账号
- 删除账号
- 设为默认

底部：

- 新增账号

------

## 12. 组件拆分要求

## 12.1 页面级组件

- `InitializeView`
- `UnlockView`
- `MainLayout`
- `SettingsView`

## 12.2 业务组件

- `SidebarCategories`
- `WebsiteList`
- `WebsiteDetail`
- `WebsiteFormDialog`
- `AccountList`
- `AccountCard`
- `AccountFormDialog`

## 12.3 通用组件

- `ConfirmDialog`
- `SearchBar`
- `Toast`
- `EmptyState`

### 组件约束

- 表单逻辑不要散落到页面中
- 列表与详情尽量分离
- 删除确认弹窗统一复用

------

## 13. 关键业务规则

## 13.1 网站规则

- 网站名称必填
- 分类必填
- 网站地址可选
- 若填写地址，则必须做基本格式校验
- 删除网站需要二次确认
- 删除网站时连带删除其下账号

## 13.2 账号规则

- 用户名必填
- 密码必填
- 每个网站最多一个默认账号
- 新增首个账号时可自动设为默认
- 将某账号设为默认时，其余账号自动取消默认
- 删除默认账号时，如果还有其他账号，则自动把第一个账号设为默认

## 13.3 密码显示规则

- 默认隐藏
- 是否默认隐藏受设置项控制
- 仅当前卡片局部显示，不要一次性展示整个网站下全部密码

## 13.4 复制规则

- 复制用户名成功后提示 toast
- 复制密码成功后提示 toast
- 若开启自动清空剪贴板，则启动计时器

------

## 14. 搜索与筛选实现建议

### 搜索输入

- 放在网站列表顶部
- 建议实时搜索

### 搜索范围

- 网站名称
- 网站地址
- 网站备注
- 网站标签
- 账号用户名
- 账号备注

### 筛选逻辑

执行顺序建议：

1. 按分类筛选
2. 再按搜索关键词过滤
3. 再按排序规则输出

### 排序规则

支持：

- 最近更新时间（默认）
- 网站名称
- 创建时间

------

## 15. 锁定与自动锁定实现建议

## 15.1 手动锁定

触发源：

- 顶部“锁定”按钮

行为：

1. 清理当前解锁态
2. 清理敏感 store 数据
3. 跳转到 `/unlock`

## 15.2 最小化锁定

触发源：

- Electron 窗口最小化事件

条件：

- 设置中 `lockOnMinimize` 为 true

行为：

- 直接触发锁定

## 15.3 超时自动锁定

触发逻辑：

- 前端监听用户活动
- 包括鼠标、键盘、点击、滚动等行为
- 到达阈值后调用锁定

建议封装为：

- `useLockTimer.ts`

------

## 16. 打开网站实现要求

### 16.1 行为要求

- 只能打开 http/https 链接
- 使用系统默认浏览器打开
- 不在应用内部打开网页

### 16.2 实现路径

- 渲染层调用 preload 暴露的 `openExternal(url)`
- 主进程内使用受控方式执行打开

### 16.3 校验要求

- 空字符串不执行
- 非法 URL 直接 toast 提示

------

## 17. 表单校验要求

## 17.1 初始化页

- 主密码不能为空
- 确认密码不能为空
- 两次密码必须一致

## 17.2 解锁页

- 主密码不能为空

## 17.3 网站表单

- 网站名称不能为空
- 分类不能为空
- URL 若填写则必须格式正确

## 17.4 账号表单

- 用户名不能为空
- 密码不能为空

------

## 18. IPC 设计建议

## 18.1 IPC 命名建议

```text
vault:exists
vault:initialize
vault:unlock
vault:get-data
vault:save-data
vault:lock
vault:change-master-password
app:open-external
clipboard:copy-text
settings:get
settings:update
```

### 原则

- 所有 IPC 语义清晰
- 不暴露大而全接口
- 参数和返回值结构固定

## 18.2 返回结构建议

统一为：

```ts
interface ApiResult<T> {
  success: boolean
  data?: T
  error?: string
}
```

------

## 19. 推荐开发顺序

### 第 1 步：搭工程骨架

- Electron + Vue 3 + Vite + TS 跑通
- BrowserWindow 安全配置完成
- preload API 骨架完成
- 路由和 Pinia 初始化

### 第 2 步：做密码库底层能力

- vault 文件路径确定
- 初始化逻辑完成
- 解锁逻辑完成
- 保存与读取完成
- 修改主密码完成

### 第 3 步：做认证流

- `/initialize`
- `/unlock`
- 路由守卫
- 解锁态 store
- 锁定态切换

### 第 4 步：做主界面骨架

- 三栏布局
- 分类切换
- 网站列表
- 网站详情空状态

### 第 5 步：做网站 CRUD

- 新增网站
- 编辑网站
- 删除网站
- 保存后刷新列表和详情

### 第 6 步：做账号 CRUD

- 新增账号
- 编辑账号
- 删除账号
- 默认账号逻辑

### 第 7 步：补实用功能

- 搜索
- 打开网站
- 复制用户名
- 复制密码
- 显示/隐藏密码

### 第 8 步：做设置与锁定

- 设置页
- 最小化自动锁定
- 超时自动锁定
- 剪贴板自动清空

### 第 9 步：收尾

- 异常处理
- toast
- 空状态
- 删除确认统一化
- 边界测试

------

## 20. 最低测试清单

## 20.1 初始化与解锁

- 首次启动可创建密码库
- 再次启动需解锁
- 错误主密码不能进入主界面

## 20.2 网站管理

- 可新增网站
- 可编辑网站
- 可删除网站
- 删除后数据持久化正确

## 20.3 账号管理

- 一个网站下可新增多个账号
- 可编辑账号
- 可删除账号
- 默认账号切换正确

## 20.4 搜索与筛选

- 分类筛选正确
- 搜索网站名称正确
- 搜索账号用户名正确

## 20.5 复制与显示

- 复制用户名正常
- 复制密码正常
- 自动清空剪贴板正常
- 密码显示/隐藏正常

## 20.6 锁定

- 手动锁定正常
- 最小化锁定正常
- 超时锁定正常
- 锁定后不可直接访问主界面

## 20.7 打开网站

- 正确地址可打开默认浏览器
- 非法地址不会错误打开

------

## 21. 常见错误避免

1. 不要把文件读写放到渲染层
2. 不要在 localStorage 里保存密码库明文
3. 不要在 window 上暴露原始 ipcRenderer
4. 不要让渲染层自己拼接系统路径
5. 不要把“锁定”只做成 UI 遮罩
6. 不要把账号平铺成一级列表
7. 不要把打开网站做成内嵌 webview
8. 不要引入收藏逻辑

------

## 22. codeX 执行要求

请 codeX 严格遵守以下要求：

1. 按 **分类 -> 网站 -> 账号** 实现数据结构
2. 网站支持多个账号
3. 收藏功能不进入 V1
4. 所有敏感存储落盘必须加密
5. Electron 能力只通过 preload 白名单桥接
6. 优先保证认证、存储、锁定逻辑正确
7. 页面完成度优先于视觉炫技
8. 所有删除必须确认
9. 所有密码默认隐藏
10. 保持代码便于后续加导入导出和密码生成器

------

## 23. 一句话给 codeX

先把 **初始化 -> 解锁 -> 主界面 -> 网站 CRUD -> 账号 CRUD -> 本地加密保存 -> 锁定** 这条主链路做通，并确保收藏功能不进入本次版本。