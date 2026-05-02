# Plan-7: 最终优化与部署配置

## 目标
完成系统最终优化，包括性能优化、错误处理、部署配置、文档完善，确保系统可顺利部署到Vercel。补充遗漏的功能：修改密码、用户个人信息查看。

## 涉及文件清单
- `src/app/error.tsx` — new (全局错误页面)
- `src/app/not-found.tsx` — new (404页面)
- `src/app/loading.tsx` — new (全局加载状态)
- `src/app/settings/page.tsx` — new (个人设置页 - 修改密码、个人信息)
- `src/app/api/auth/password/route.ts` — new (修改密码API)
- `src/components/common/ErrorBoundary.tsx` — new (错误边界组件)
- `src/components/common/Toast.tsx` — new (全局Toast通知)
- `src/components/settings/PasswordForm.tsx` — new (修改密码表单)
- `src/components/settings/ProfileCard.tsx` — new (个人信息卡片)
- `src/lib/utils.ts` — modify (添加工具函数)
- `README.md` — new (项目说明文档)
- `.env.production.example` — new (生产环境变量模板)
- `vercel.json` — modify (最终部署配置)
- `jest.config.js` — new (Jest测试配置)
- `src/__tests__/unit/lib/auth.test.ts` — new (认证单元测试示例)

## 依赖项
- Plan-1 到 Plan-6 全部完成

## 实现要点
- 个人设置页路径: /settings
  - 显示当前用户信息（用户名、邮箱、创建时间）
  - 修改密码功能（旧密码验证、新密码、确认新密码）
- 全局错误处理：Error Boundary捕获React错误
- 404页面：友好的未找到页面
- 加载状态：全局loading指示器
- Toast通知：操作成功/失败的反馈（删除操作确认对话框）
- 性能优化：
  - 组件懒加载（React.lazy + Suspense）
  - 图片优化（next/image）
  - API响应时间<500ms（95%请求）
  - 页面加载时间<2秒（95%请求）
- API错误统一处理
- 生产环境变量配置文档
- Vercel部署配置：
  - 路由规则（rewrites/redirects）
  - 环境变量（DATABASE_URL、JWT_SECRET等）
  - Cron Job（定时探测配置）
  - 构建配置（Build Command、Output Directory）
- 添加README文档：项目介绍、安装步骤、部署指南
- Vercel平台特定配置：
  - 使用云数据库 MySQL 8.4 作为生产数据库
  - 函数超时时间设置（Cron函数≤60s）
  - 环境变量配置：
    - MYSQL_HOST
    - MYSQL_PORT
    - MYSQL_DATABASE
    - MYSQL_USER
    - MYSQL_PASSWORD
    - MYSQL_POOL_SIZE（连接池大小，默认10）
    - JWT_SECRET
- 安全加固：
  - SQL注入防护（使用ORM参数化查询）
  - XSS防护（输入过滤、输出转义）
  - CSRF防护（Token验证）
  - 全站HTTPS（Vercel自动配置）
  - 密码加密bcrypt（cost factor 12）
  - JWT Token 7天过期
- 浏览器兼容性：Chrome 90+、Firefox 88+、Safari 14+、Edge 90+

## 预期验证方式
- `npm run build` 构建成功
- `npm run dev` 开发环境运行正常
- 所有页面功能正常
- 错误页面显示正常
- 可以成功部署到Vercel
- 修改密码功能正常
- 个人信息显示正确

## 交付物清单
- [ ] 个人设置页完成（修改密码、个人信息）
- [ ] 全局错误处理完成
- [ ] 404页面完成
- [ ] Toast通知系统完成
- [ ] 性能优化完成
- [ ] README文档完成（包含MySQL 8.4配置说明）
- [ ] Vercel部署配置完成
- [ ] 测试配置完成（Jest + React Testing Library）
- [ ] 示例测试用例通过
- [ ] 构建无错误
- [ ] 可成功部署到Vercel
- [ ] MySQL连接池配置正确
