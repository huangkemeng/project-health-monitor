## Plan-9: 代码安全风险修复

### 目标
修复代码扫描报告中发现的安全漏洞和代码质量问题，包括硬编码密钥、SQL注入风险、XSS防护等。

### 涉及文件清单
- `backend/src/routes/monitors.ts` — modify
- `backend/src/routes/cron.ts` — modify
- `backend/src/lib/db.ts` — modify
- `backend/src/routes/auth.ts` — modify
- `backend/src/lib/auth.ts` — modify (检查JWT配置)
- `frontend/src/app/monitors/new/page.tsx` — modify
- `frontend/src/lib/api.ts` — modify
- `frontend/src/app/dashboard/page.tsx` — modify
- `frontend/src/app/error.tsx` — modify (增强错误边界)
- `backend/src/utils/validators.ts` — modify (添加URL验证)

### 依赖项
- Depends on Plan-8 功能补全完成的代码基础

### 实现要点
- 移除所有硬编码密钥和密码默认值
- 添加输入验证和过滤防止SQL注入
- 加强URL验证防止XSS攻击
- 实现请求取消机制防止内存泄漏
- 统一类型导入提高代码质量

### 预期验证方式
- `npm run dev` 启动正常
- 所有现有功能正常工作
- 编译无错误

### 交付物清单
- [ ] 所有安全漏洞修复完成
- [ ] 编译无错误
- [ ] 功能测试通过
