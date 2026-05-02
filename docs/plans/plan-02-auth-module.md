# Plan-2: 用户认证模块

## 目标
实现用户注册、登录、登出功能，包括前端页面和后端API，使用JWT进行身份认证。面向后端开发工程师和全栈开发工程师，提供简洁的认证体验。

## 涉及文件清单
- `src/app/login/page.tsx` — new (登录页面)
- `src/app/register/page.tsx` — new (注册页面)
- `src/app/api/auth/register/route.ts` — new (注册API - POST)
- `src/app/api/auth/login/route.ts` — new (登录API - POST)
- `src/app/api/auth/logout/route.ts` — new (登出API - POST)
- `src/app/api/auth/me/route.ts` — new (获取当前用户API - GET)
- `src/components/auth/LoginForm.tsx` — new (登录表单组件)
- `src/components/auth/RegisterForm.tsx` — new (注册表单组件)
- `src/hooks/useAuth.ts` — new (认证状态管理hook)
- `src/middleware.ts` — new (路由保护中间件)
- `src/lib/password.ts` — new (密码加密工具，使用bcryptjs)
- `src/lib/api-response.ts` — new (统一API响应格式工具)

## 依赖项
- Plan-1 完成：基础项目架构、数据库连接、JWT工具

## 实现要点
- 登录页路径: /login，注册页路径: /register
- 使用 `bcryptjs` 进行密码加密（cost factor 12），替代原生bcrypt（避免Node.js依赖）
- JWT Token有效期7天，使用 `jose` 库进行签名和验证
- 实现登录状态持久化（localStorage存储token）
- 统一API响应格式：
  - 成功：{ code: 200, message: "success", data: {...} }
  - 错误：{ code: 400/401/500, message: "错误描述", errors: [{field, message}] }
- API接口规范：
  - POST /api/auth/register - 用户注册
  - POST /api/auth/login - 用户登录，返回 { access_token, token_type, expires_in, user }
  - POST /api/auth/logout - 用户登出
  - GET /api/auth/me - 获取当前用户信息（需认证）
- 表单校验：
  - 用户名：3-20字符，字母开头，只允许字母数字下划线
  - 邮箱：有效邮箱格式
  - 密码：8-32字符，必须包含字母和数字
  - 确认密码：必须与密码一致
- 登录失败处理：连续5次密码错误后锁定账号15分钟
- 错误信息模糊：不区分"用户名不存在"和"密码错误"
- 中间件保护需要登录的页面（自动跳转登录页）
- 支持"记住我"功能（延长Token有效期）
- 页面设计简洁，符合开发人员使用习惯

## 预期验证方式
- `npm run dev` 启动正常
- 访问 http://localhost:3000 自动跳转到登录页
- 可以成功注册新用户
- 可以使用注册账号登录
- 登录后跳转到监控大盘
- 登出后清除token并跳转登录页
- 未登录访问受保护页面自动跳转登录页

## 交付物清单
- [ ] 登录/注册页面UI完成（简洁风格）
- [ ] 认证API接口完成
- [ ] 表单校验功能正常（前端+后端双重校验）
- [ ] 登录状态持久化正常
- [ ] 路由保护功能正常
- [ ] 密码加密安全（bcryptjs）
- [ ] 登录失败锁定机制
- [ ] 编译无错误
