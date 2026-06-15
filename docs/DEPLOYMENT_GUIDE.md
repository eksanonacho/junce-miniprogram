# DEPLOYMENT_GUIDE.md — 部署说明书

> **这个文件是给谁看的**:未来负责上线/部署的人(或 AI)。
> **什么时候用**:本地跑项目、或将来部署到云服务器时。
> **解决什么问题**:照着它能在本地运行,也能在未来上线时按推荐方案部署。
>
> ✅ **Docker 本地演练已通过 (2026-06-13)。**
> - 镜像: node:22-alpine, postgres:16-alpine, nginx:alpine
> - docker compose build ✅ / up ✅
> - seed 成功 (6 角色 + 6 测试账号 + 15 服务模板)
> - 冒烟测试 21/21 通过
> - GET /health 基础设施接口正常
> - 下一阶段: staging 云部署
> 最后更新:2026-06-13。

---

## 一、当前本地运行方式(真实可用)

### 前置环境(已装好)
- Node.js v24
- pnpm
- PostgreSQL 16(库名 junce_dev 已建)
- Colima(Mac 上替代 Docker Desktop 的容器运行时)

### 1.1 启动 PostgreSQL
PostgreSQL 通过 brew 安装,作为服务运行:
```bash
# 启动(若未运行)
brew services start postgresql@16
# 确认数据库存在
psql -d junce_dev -c "\dt"
```

### 1.2 启动后端(NestJS)
```bash
cd /Users/a1234/cpp/junce-miniprogram/server
export PATH=~/.npm-global/bin:$PATH
pnpm start:dev
```
成功标志:看到 `Nest application successfully started`,服务在 `http://localhost:3000`。
> 端口被占用报 EADDRINUSE 时:`lsof -ti:3000 | xargs kill -9` 杀掉旧进程再启动。

### 1.3 启动前端(uni-app)
```bash
cd /Users/a1234/cpp/junce-miniprogram/client
# H5 调试
pnpm dev:h5
# 或用微信开发者工具打开编译后的小程序产物
```

### 1.4 Colima / Docker 当前状态
- ✅ **Docker 本地演练已通过 (2026-06-13)**。
- 镜像: node:22-alpine, postgres:16-alpine, nginx:alpine
- docker compose build / up 成功，三容器均正常运行
- seed 成功（6 角色 + 6 测试账号 + 15 服务模板）
- 冒烟测试 21/21 通过
- GET /health 为基础设施接口，不计入 55 个业务接口
- 下一阶段: staging 云部署

---

## 二、环境变量

后端用 `.env` 文件管理环境变量(位于 server/.env)。**以下为示例,不含真实密码,真实值不要提交进 git。**

```bash
# 数据库连接(示例)
DATABASE_URL="postgresql://用户名:密码@localhost:5432/junce_dev?schema=public"

# JWT 签名密钥(示例,生产环境必须用强随机字符串)
JWT_SECRET="替换成一段足够长的随机字符串"

# JWT 过期时间(示例)
JWT_EXPIRES_IN="7d"

# 后端端口
PORT=3000

# —— 未来文件上传相关(办件归档模块用,届时再加)——
# 存储方式:local / oss
# FILE_STORAGE_DRIVER="local"
# 若用阿里云 OSS:
# OSS_REGION=""
# OSS_BUCKET=""
# OSS_ACCESS_KEY_ID=""
# OSS_ACCESS_KEY_SECRET=""
```

> 安全:`.env` 必须在 .gitignore 里(不进版本库);生产的 JWT_SECRET、数据库密码要用强随机值,与开发环境不同。

---

## 三、推荐生产部署架构(未来上线时)

```
        用户(微信小程序 / H5 浏览器)
                  │  HTTPS
                  ▼
        ┌───────────────────┐
        │   Nginx 反向代理    │  HTTPS 证书 / 域名 / 转发
        └─────────┬─────────┘
                  │
        ┌─────────┴──────────┐
        ▼                    ▼
 ┌─────────────┐     ┌─────────────────┐
 │ NestJS API  │     │ uni-app H5 静态  │
 │ (容器)       │     │ (Nginx 托管)     │
 └──────┬──────┘     └─────────────────┘
        │
        ▼
 ┌─────────────┐
 │ PostgreSQL  │ (容器 + 数据卷)
 └─────────────┘
```

要点:
- **云服务器以君册财税名义注册**(合同特别约定),开发方代购代管;首年费用含在合同总价内,第二年起客户自续。
- **两个项目(AI 初诊 + 小程序)共用同一台服务器**,Docker 容器隔离运行。
- Nginx 做反向代理:统一入口、配 HTTPS、按域名/路径转发到不同服务。
- 微信小程序需企业认证(君册主体)+ 审核;后端接口需 HTTPS(微信小程序强制要求 HTTPS)。

---

## 四、Docker 化计划(未来)

当前未容器化。上线时需要准备:

- **Dockerfile.server**:把 NestJS 后端打包成镜像(装依赖 → build → 启动)。
- **docker-compose.yml**:一键编排三个服务——
  - postgres(数据库,挂数据卷)
  - server(NestJS API)
  - nginx(反向代理 + HTTPS + 托管 H5 静态文件)
- **postgres volume**:数据库数据用 Docker volume 持久化,**容器重建数据不丢**(这点至关重要,别让数据库数据只存在容器内)。
- **nginx 配置**:反向代理规则、HTTPS 证书挂载、gzip、静态资源缓存。

> 提示:本地已装 Colima,可在本地用 docker-compose 先演练一遍,确认无误再上服务器,降低"本地能跑线上不能跑"的风险。

---

## 五、数据库备份与恢复

### 备份(pg_dump)
```bash
# 导出整个数据库到文件
pg_dump -d junce_dev -F c -f junce_backup_$(date +%Y%m%d).dump
# 或导出为纯 SQL
pg_dump -d junce_dev -f junce_backup_$(date +%Y%m%d).sql
```

### 恢复
```bash
# 从 custom 格式恢复
pg_restore -d junce_dev junce_backup_YYYYMMDD.dump
# 从 SQL 文件恢复
psql -d junce_dev -f junce_backup_YYYYMMDD.sql
```

### 铁律
- **上线前必须备份。** 任何改表结构的 migration 在生产执行前,先 pg_dump 备份。
- 生产环境建议定期自动备份(如每日),备份文件存到服务器以外的位置(对象存储/本地)。

---

## 六、部署风险(上线时重点排查)

| 风险 | 说明 | 规避 |
|---|---|---|
| 端口冲突 | 3000(或其他)端口被占 | 部署前 `lsof -ti:端口 \| xargs kill -9`;容器内固定端口、Nginx 转发 |
| 环境变量缺失 | 生产没配 DATABASE_URL / JWT_SECRET 导致启动失败 | 部署前核对 .env 齐全;JWT_SECRET 用强随机值 |
| 数据库连接失败 | DATABASE_URL 写错、数据库没起、网络不通 | 先确认 postgres 容器健康、连接串正确;容器间用服务名而非 localhost |
| HTTPS 配置 | 微信小程序强制 HTTPS,证书没配/过期则接口不可用 | 用有效 SSL 证书;证书到期前续期;Nginx 配好 443 |
| 服务器续费 | 首年含在合同,第二年客户自续,忘续会停服 | 交付时明确告知续费时间方式;服务器以客户名义注册,主动权在客户;到期前提醒 |
| 文件上传存储 | 办件归档文件持续增长,占满磁盘 | 文件存储做成可切换(local/OSS);评估用对象存储;设文件大小/类型限制 |
| CORS / 跨域 | H5 跨域请求被浏览器拦 | 后端开启 CORS;生产同域部署可规避大部分跨域 |
| ESM/CJS(Prisma) | 重装依赖/升级 Prisma 可能重现启动报错 | schema.prisma 保留 `moduleFormat="cjs"`;重新 generate + build |

---

## 七、上线 checklist(将来部署时逐项打勾)

- [ ] 云服务器以君册名义注册、实名、(如需)备案完成
- [ ] 域名解析、SSL 证书配好
- [ ] .env 生产变量齐全,JWT_SECRET / 数据库密码为强随机值
- [ ] Docker 镜像构建、docker-compose 编排通过(先本地演练)
- [ ] postgres 数据卷持久化确认
- [ ] Nginx 反向代理 + HTTPS 配置验证
- [ ] 微信小程序企业认证 + 审核通过
- [ ] 数据库已备份
- [ ] 接口在生产环境冒烟测试通过(登录 + 客户增删改查)
