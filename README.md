# Agora / 对话广场

学校社团官网 + 演讲 PPT 档案平台。  
P0 采用单 Worker + 静态资源 + API 同域结构：

- 前端：React + Vite + TypeScript
- 后端：Cloudflare Workers
- 数据：Cloudflare D1
- 文件：Cloudflare R2

## P0 已实现

- 首页
- 详细社团介绍页
- 演讲 PPT 列表页
- 演讲详情页
- 管理员登录页
- 管理后台
- 演讲新增、编辑、删除
- PPT 上传与公开下载
- 演讲者反馈文字编辑

## 项目结构

- `src/`: React 前端
- `worker/`: Cloudflare Worker API
- `shared/`: 前后端共享类型
- `migrations/`: D1 表结构
- `scripts/`: 管理员初始化脚本

## 本地开发

1. 安装依赖

```bash
npm install
```

2. 配置本地环境变量

```bash
cp .dev.vars.example .dev.vars
```

需要提供：

- `SESSION_SECRET`
- `ADMIN1_PASSWORD`
- `ADMIN2_PASSWORD`

3. 初始化本地数据库

```bash
npm run db:migrate:local
npm run db:seed:local
```

4. 启动开发环境

```bash
npm run dev
```

- 前端：`http://localhost:5173`
- Worker API：`http://127.0.0.1:8787`

## 本地验证

静态检查与构建：

```bash
npm run typecheck
npm run build
```

可选 API 检查：

```bash
curl http://127.0.0.1:8787/api/health
```

## 远程数据库初始化

先创建 D1，再执行：

```bash
npm run db:migrate:remote
npm run db:seed:remote
```

## Cloudflare 部署

1. 创建 D1

```bash
npx wrangler d1 create agora-club-db
```

2. 创建 R2 bucket

```bash
npx wrangler r2 bucket create agora-club-ppt
```

3. 写入运行时 secret

```bash
npx wrangler secret put SESSION_SECRET
```

4. 部署

```bash
npm run deploy
```

## GitHub

创建并推送仓库：

```bash
gh repo create agora-club-website --public --source=. --remote=origin --push
```

## 当前已知外部阻塞

当前 Cloudflare 账号返回：

- `Please enable R2 through the Cloudflare Dashboard. [code: 10042]`

这意味着代码、本地模拟与 D1 已就绪，但生产 R2 bucket 无法在该账号下创建，因此正式部署到 `workers.dev` 仍需要先在 Cloudflare Dashboard 开通 R2。
