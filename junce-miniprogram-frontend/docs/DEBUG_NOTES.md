# 前端踩坑记录

> 记录开发中遇到的问题、原因、解决方案，防止重复踩坑。

## 1. 401 语义分流

**问题**：登录错误密码返回 401，前端弹"登录已过期"而非后端 message。

**原因**：request.js 把所有 401 统一处理为 token 失效。

**解决**：按 `skipAuth` 区分两类 401：
- `skipAuth=true`（认证类）：显示后端 message，不清登录态
- `skipAuth=false`（业务类）：清登录态 + reLaunch 登录页

**文件**：`src/utils/request.js` 401 分支。

**详情**：见 `docs/bug-reports/2026-06-06-login-401.md`

---

## 2. token 失效重复跳转

**问题**：多个业务请求同时返回 401，触发多次 reLaunch。

**解决**：模块级 `isRedirecting` 锁 + `complete` 回调自解锁。

**文件**：`src/utils/request.js`

---

## 3. BASE_URL 局域网 IP 会变

**问题**：BASE_URL 是局域网 IP（172.20.10.5:3000），换 Wi-Fi / 重启路由器后可能变。

**解决**：前端只改 `src/config/index.js` 一处即可。

---

## 4. CORS / 网络问题

**问题**：H5 跨域、代理 502。

**排查步骤**：
1. 浏览器 CORS 错误 → 确认后端已开 CORS
2. 502 → 本机代理拦截，curl 加 `--noproxy "*"`，浏览器关代理或加白名单
3. 手机打不开 → 检查是否同一 Wi-Fi

---

## 5. Pinia 版本兼容

**问题**：`vue@3.4.21`，所有 pinia 版本裸装都失败。

**原因**：
- pinia ≤2.2.x 有 `@vue/composition-api` peer dep（Vue2 包，与 3.4.21 冲突）
- pinia ≥2.3.x 移除了它，但 vue peer dep 提升为 `^3.5.11`

**最终方案**：`npm install pinia@2.0.33 --legacy-peer-deps`
- pinia@2.0.33 的 vue peer dep 为 `^3.2.0`，与 3.4.21 兼容
- `--legacy-peer-deps` 跳过 `@vue/composition-api` 的自动安装

---

## 6. GET /customers 返回裸数组

**注意**：`GET /customers` 返回的是 `[{...}, {...}]`，不是 `{ code: 0, data: [...] }` 包装结构。

**代码**：`list.value = res`（不要写 `list.value = res.data`）

---

## 7. PATCH 只传修改字段

**注意**：`PATCH /customers/:id` 要求只传要改的字段，不能全量提交。

**实现**：编辑页维护 `original`（GET 返回的原始数据）和 `form`（当前表单），提交时逐字段 diff，仅把不同的字段放入 payload。

**MVP 限制**：不支持清空字段（用户清空某字段 → 该字段不加入 payload → 后端保持原值）。

---

## 8. staff-assignment 404 toast 副作用

**问题**：GET /customers/:id/staff-assignment 返回 404 时，request.js 会 toast "请求失败"，然后页面正常渲染"未配置"。

**原因**：request.js 无 404 独立分支，404 落入 `else` 兜底分支。

**影响**：首次进入未配置人员的客户详情页时，出现一次不应有的 toast。不影响页面功能。

**状态**：P1，已知限制，不阻塞。后续评估是否需要为 404 增加独立分支（区分"资源不存在"和"接口异常"）。

**联调日期**：2026-06-10

---

## 9. WXSS 中文 CSS class 编译错误

**问题**：微信 WXSS 编译器不支持中文 CSS class selector（如 `.status-未收`），报 `unexpected '�'`。

**原因**：WXSS 编译器对中文字符在 CSS selector 中的处理不稳定。

**解决**：全部中文 class 替换为英文映射（`status-unpaid/status-todo/status-processing` 等），模板中用 `getXxxStatusClass()` 函数做中文→英文映射。

**涉及文件**：workorder-list、workorder-detail、task-list、task-detail、fission-list、fission-detail、charge-detail、customer-detail、charge-unpaid-list

**日期**：2026-06-21

---

## 10. sed 批量注入导致 CSS 嵌套

**问题**：`sed -i '/^\.container /a\...'` 将 `.form-section-label` CSS 规则插入到 `.container {}` 块内部，形成 WXSS 不支持的嵌套 CSS，报 `unexpected {`。

**解决**：python 正则批量解除嵌套（form-section-label 移出 .container 块）+ 模板重复 label 去重。

**涉及文件**：customer-form、customer-edit、workorder-create、task-create、fission-create、staff-config

**日期**：2026-06-21

---

## 11. AI 开发注意事项

- Claude Code 接 DeepSeek，可能凭记忆答错（曾编造后端框架、记错依赖版本、误报兼容版本）
- 涉及版本号、依赖、接口字段等事实：**先查证再回答**（`ls` / `cat` / `npm ls`）
- 每次开发前必须读 `docs/` 下的文档
- 不允许凭记忆判断接口存在与否
- 不确定就查 `API_CONTRACT.md`
