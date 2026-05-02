# 项目健康监控系统 - 需求文档

> **文档状态**: 初稿  
> **版本**: v1.0  
> **最后更新**: 2026-05-02  
> **编写人**: 产品需求分析师

---

## 📑 文档目录

本需求文档包含以下文件，请按顺序阅读：

| 序号 | 文档 | 文件名 | 内容概述 |
|:---:|------|--------|---------|
| - | **索引与导航** | `README.md` | 本文档，提供完整导航和术语表 |
| 1 | [项目概述与背景](./01-overview.md) | `01-overview.md` | 项目背景、目标、范围、成功指标 |
| 2 | [用户角色与权限](./02-user-roles.md) | `02-user-roles.md` | 用户画像、角色定义、权限矩阵 |
| 3 | [业务流程与状态机](./03-business-flow.md) | `03-business-flow.md` | 核心业务流程、状态机、时序图 |
| 4 | [功能需求详述](./04-functional-requirements.md) | `04-functional-requirements.md` | 详细功能需求（按模块拆分） |
| 5 | [数据模型设计](./05-data-model.md) | `05-data-model.md` | 数据库设计、实体关系图、字段定义 |
| 6 | [API接口定义](./06-api-specification.md) | `06-api-specification.md` | RESTful API 接口定义、请求/响应示例 |
| 7 | [非功能需求](./07-non-functional.md) | `07-non-functional.md` | 性能、安全、可用性等非功能需求 |
| 8 | [界面原型与交互](./08-ui-prototype.md) | `08-ui-prototype.md` | 界面原型描述、交互说明、页面清单 |
| 9 | [测试策略与验收标准](./09-testing.md) | `09-testing.md` | 测试策略、测试用例、验收标准 |
| 10 | [部署与运维指南](./10-deployment.md) | `10-deployment.md` | 部署架构、环境要求、运维手册 |
| 11 | [项目计划与里程碑](./11-roadmap.md) | `11-roadmap.md` | 项目计划、里程碑、迭代规划 |

---

## 📋 版本记录

| 版本 | 日期 | 修改人 | 修改内容 |
|-----|------|-------|---------|
| v1.0 | 2026-05-02 | - | 初始版本，完成核心需求定义 |

---

## 🎯 文档目标读者

- **产品经理**: 了解完整产品需求，进行需求评审
- **开发人员**: 理解功能细节，进行技术设计和编码
- **测试人员**: 制定测试计划，编写测试用例
- **运维人员**: 了解部署和运维要求
- **项目经理**: 掌握项目范围和进度规划

---

## 📚 术语表

| 术语 | 英文 | 定义 |
|-----|------|------|
| 监控项 | Monitor Item | 需要被监控的Web服务或API接口的配置实体 |
| 探测 | Probe/Check | 向监控目标发送HTTP请求，检测其可用性的行为 |
| 告警 | Alert | 当监控目标异常时，通过企业微信发送的通知 |
| 静默期 | Silence Period | 告警触发后的一段时间内，相同问题不再重复发送告警 |
| 连续失败次数 | Consecutive Failures | 监控目标连续探测失败的次数计数 |
| Webhook | Webhook | 企业微信机器人的回调地址，用于发送群消息 |
| 恢复通知 | Recovery Notification | 监控目标从异常状态恢复正常时发送的通知 |
| 分级告警 | Graded Alert | 根据严重程度分为"警告"和"严重"两个级别的告警 |
| 响应时间 | Response Time | 从发送HTTP请求到收到响应的时间间隔，单位毫秒 |
| 可用率 | Uptime | 在一定时间范围内，服务正常可用的时间占比 |

---

## 🔗 相关资源

- [企业微信机器人开发文档](https://developer.work.weixin.qq.com/document/path/91770)
- [项目代码仓库](./) (待补充)
- [设计稿链接](./) (待补充)

---

## ❓ 文档使用说明

1. **快速了解项目**: 阅读 [01-overview.md](./01-overview.md) 和 [04-functional-requirements.md](./04-functional-requirements.md)
2. **进行技术开发**: 重点阅读 [04-functional-requirements.md](./04-functional-requirements.md)、[05-data-model.md](./05-data-model.md)、[06-api-specification.md](./06-api-specification.md)
3. **编写测试用例**: 参考 [04-functional-requirements.md](./04-functional-requirements.md) 的验收标准和 [09-testing.md](./09-testing.md)
4. **部署上线**: 阅读 [10-deployment.md](./10-deployment.md)

---

## 📝 反馈与修订

如发现文档中的问题或有任何疑问，请通过以下方式反馈：
- 在文档中标注 `[待澄清]` 的问题
- 联系产品经理进行需求确认

---

*本文档由 AI 产品需求分析师生成，仅供项目参考使用。*
