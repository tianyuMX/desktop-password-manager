# 密码保险箱

一款使用 Electron、Vue 3、TypeScript、Pinia 和 Vuetify 构建的本地密码管理器。账号数据保存在本机的加密密码库中。

## 简单使用说明

1. 首次启动时设置主密码，并牢记该密码。
2. 点击“新增网站”，填写网站名称、地址、分类和备注。
3. 进入网站详情后添加账号、密码，也可以设置默认账号和验证邮箱。
4. “邮箱管理”可统一维护多个网站共用的邮箱资料，并查看关联账号。
5. 删除的网站、账号或邮箱会进入回收站，可在 30 天内恢复。
6. 点击右上角“锁定”可立即退出密码库；自动锁定、剪贴板清理等选项可在“设置”中调整。

应用每次保存数据时还会生成一份便于查看的 Excel 备份。正式版默认写入 `D:\账号密码备份.xlsx`；该文件包含明文账号和密码，请勿上传或分享。

## 本地运行

需要先安装 Node.js，然后在项目目录执行：

```bash
cd frontend
npm install
npm start
```

## 开发命令

```bash
npm run typecheck
npm run test:mailboxes
npm run build
npm run package
```

密码库、Excel 备份、环境变量、构建产物和本地缓存均不应提交到 Git 仓库。

## 许可证

本项目采用 [PolyForm Noncommercial License 1.0.0](LICENSE.md)。允许非商业使用、修改和分发；未经另行授权，不允许商业使用。
