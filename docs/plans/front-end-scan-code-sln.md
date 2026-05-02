## 一、React / 组件层

| Bug 类型 | 典型示例 | AI 检测依据 |
|---------|----------|--------------|
| **Hooks 依赖遗漏** | `useEffect(() => { fetch(prop.id); }, [])` 但函数体内用了 `prop.id` | 静态分析依赖数组与闭包变量 |
| **条件性 Hooks 调用** | `if (flag) { useState(0) }` | Hooks 调用顺序必须一致 |
| **state 直接突变** | `state.obj.key = newVal; setState(state)` | 检测赋值操作在 setState 前未拷贝 |
| **渲染期间修改状态** | `if (count === 0) setCount(1)` 在 render 中 | 数据流分析（render 应纯函数） |
| **无效 key prop** | `<li key={index}>` (使用索引当key) 且列表会重排序 | 提示使用稳定唯一 id |
| **闭包陷阱（过期状态）** | `setTimeout(() => setCount(count+1), 1000)` 依赖旧 count | 识别未通过函数式更新或 ref |
| **大组件未拆分** | 单个组件超过 300 行 / 10 个 useState | 圈复杂度 + 组件大小阈值 |
| **未错误边界** | 组件可能抛错，但无 ErrorBoundary 包裹 | 检测缺少 `componentDidCatch` / `getDerivedStateFromError` |
| **Prop drilling 过度** | 多层传递 `user` prop（超过 3 层） | 调用图深度分析 |
| **未 memo 导致无效渲染** | 父组件刷新导致所有子组件重新渲染，尤其子组件 props 未变 | 缺失 `React.memo` 或 `useMemo` 的启发式 |

---

## 二、JavaScript / 通用前端逻辑

| Bug 类型 | 典型示例 | AI 检测依据 |
|---------|----------|--------------|
| **异步未等待** | `onClick={() => { asyncFunc(); }}` 后续代码依赖结果但未 await | 控制流分析（缺少 await / .then） |
| **Promise 未捕获拒绝** | `fetch(url).then(res => ...);` 无 `.catch` | 未处理被拒绝的 Promise |
| **事件监听器泄漏** | 在 useEffect 中添加事件但未清除 | 缺少清理函数 |
| **空对象/数组判断错误** | `if (obj) ` 但想要 `Object.keys(obj).length === 0` | 对 falsy 和空容器的混淆 |
| **setTimeout 内使用组件状态** | 闭包捕获旧状态 | 同 React 闭包陷阱 |
| **浮点数累加精度** | `0.1 + 0.2 !== 0.3` | 检测小数比较直接使用 `===` |
| **typeof 误用** | `typeof null === 'object'` 导致逻辑错误 | 建议用 `obj === null` 单独判断 |
| **错误使用 `==` 导致类型转换** | `if (value == 1)` 当 value 为 `"1"` | 推荐 `===` |
| **正则灾难性回溯** | `/(a+)+b/.test('a'.repeat(30)+'c')` 超时 | 正则复杂度分析 |
| **忽略返回的布尔值** | `element.classList.toggle('hidden')` 未使用返回值（本身无害，但语义混淆） | 语义检查 |

---

## 三、HTML / DOM 结构

| Bug 类型 | 典型示例 | AI 检测依据 |
|---------|----------|--------------|
| **无效 ARIA 属性** | `aria-label` 输入框但标签为空 | 规则校验（WCAG） |
| **缺少 alt** | `<img src="logo.png">` 无 alt | 属性必填检查 |
| **按钮未指定 type** | `<button onClick={...}>` 在表单内默认 type="submit" | 缺少显式 type |
| **重复 id** | 两个元素 `id="header"` | 全局唯一性 |
| **自闭合标签错误** | `<div/>` 应闭合为 `<div></div>` | HTML 语法解析 |
| **form 未阻止默认提交** | `<form onSubmit={handleSubmit}>` 未调用 `preventDefault` | 检测回调中无 e.preventDefault |
| **a 标签 href="javascript:void(0)"** | 应改用 button 或 preventDefault | 反模式识别 |
| **input 缺少 name** | 表单提交时无法识别字段 | 属性缺失 |
| **自闭和无效元素** | `<div class="container" />` 导致内容被忽略 | 解析警告 |

---

## 四、CSS / 样式层

| Bug 类型 | 典型示例 | AI 检测依据 |
|---------|----------|--------------|
| **类名拼写错误/未定义** | `className="btuon"` 但 CSS 为 `.button` | 静态分析类名 vs 样式表 |
| **样式冲突（级联过强）** | `#id .class div` 导致难以覆盖 | 特异性分数过高警告 |
| **继承属性误用** | 父级 `font-size: 10px`，子元素 `em/rem` 计算混乱 | 计算值分析 |
| **z-index 魔数或层级混乱** | 多个元素 `z-index: 999` 无管理 | 检测未使用 CSS 变量或主题系统 |
| **动画导致布局抖动** | 使用 `top/left` 而非 `transform` | 检测布局属性动画（重排） |
| **响应式断点遗漏** | 媒体查询只设置 `max-width: 768px`，未覆盖中间尺寸 | 检测断点间隙 |
| **颜色对比度不足** | 灰色背景 + 浅灰文字 | WCAG 对比度公式 |
| **伪类顺序错误** | `a:visited:focus` 应 `:focus` 最后 | 顺序规则（LoVeHAte） |
| **单位缺失** | `margin: 0` 可接受，但 `width: 100` 应为 `100%` 或 `100px` | 数值后无单位警告 |
| **flex/grid 属性冗余** | `display: flex; flex-direction: row; justify-content: flex-start;` 默认值可省略 | 冗余检测 |

---

## 五、性能与效率（前端特有）

| Bug 类型 | 典型示例 | AI 检测依据 |
|---------|----------|--------------|
| **未缓存重复计算** | 每次渲染计算 `filteredList = list.filter(...)` 依赖不变 | 建议 `useMemo` |
| **大列表未虚拟化** | 直接渲染 5000+ 行 DOM | 元素数量阈值提醒 |
| **频繁导致重排** | 循环中读写 offsetHeight / 修改 className | 识别强制同步布局 |
| **图片未懒加载** | `<img src="large.jpg">` 全部立即加载 | 未使用 `loading="lazy"` |
| **未拆分代码** | 单个 bundle 体积 > 500KB（初次加载） | 检测动态 import 缺失 |
| **内存泄漏** | 全局变量存储大量 DOM 引用 | 逃逸分析 |
| **无限滚动未节流** | scroll 事件每帧触发加载 | 缺少 throttle/debounce |
| **第三方脚本阻塞渲染** | `<script src="...">` 没有 defer/async | 检测非异步脚本位置 |

---

## 六、安全漏洞（前端）

| Bug 类型 | 典型示例 | AI 检测依据 |
|---------|----------|--------------|
| **XSS（innerHTML/dangerouslySetInnerHTML）** | `el.innerHTML = userInput` | 污点分析（用户输入未转义） |
| **eval / new Function** | `eval('alert("hello")')` | 直接调用检测 |
| **DOM clobbering** | `document.getElementById('form')` 被同 name 元素覆盖 | 检查未 sanitize 的 name 属性 |
| **开放重定向** | `window.location = urlParam` | 检测未验证 origin |
| **localStorage 存储敏感信息** | 存 token 但不加密 | 敏感词匹配（password, token, credit） |
| **点击劫持** | 缺少 `X-Frame-Options`（前端可提醒） | 检测 meta 标签缺失 |
| **postMessage 未验证来源** | `window.addEventListener('message', ...)` 未检查 `event.origin` | 缺少 origin 校验 |

---

## 七、工具链与配置问题（AI 可辅助诊断）

| 类型 | 示例 | AI 检测方式 |
|-----|------|-------------|
| **browserslist 配置错误** | 未包含目标浏览器，导致使用了不支持的特性 | 对比特性与配置 |
| **package.json 依赖冲突** | React 版本 16 与 18 共存 | 依赖图谱分析 |
| **未使用 tree shaking** | 导入整个 lodash 而非 `import get from 'lodash/get'` | 检测具名导入 |
| **环境变量缺失** | `process.env.REACT_APP_API_URL` 未定义时 fallback | 静态检查未配置的变量 |
| **sourcemap 泄露到生产** | `devtool: 'source-map'` 在 production 配置中 | 检测 webpack/vite 配置 |

---

