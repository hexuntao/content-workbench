export type EditorialPrinciple = {
  title: string;
  description: string;
};

export type DesignTokenGroup = {
  name: string;
  description: string;
  tokens: readonly string[];
};

export const editorialPrinciples: EditorialPrinciple[] = [
  {
    title: "冷静控制感",
    description:
      "信息应该呈现为经过编辑，而不是经过装饰。用明确的字重、节制的对比和稳定的节奏承接高密度内容，而不是把页面做成展板。",
  },
  {
    title: "桌面式层次",
    description:
      "界面层次应当像纸面、托盘、导航轨和批注层协同工作。通用 SaaS 卡片会抹平层级，让所有区域都在争抢同一份注意力。",
  },
  {
    title: "可复用节奏",
    description:
      "路由壳、导航、空状态和加载状态应共享同一套节奏，这样后续线程只需要补充内容，不需要再发明第二套视觉系统。",
  },
];

export const designTokenGroups: DesignTokenGroup[] = [
  {
    name: "颜色变量",
    description: "暖纸面底色、克制的墨色与单一强调色，共同决定工作台的情绪温度。",
    tokens: ["--color-canvas", "--color-surface-raised", "--color-ink", "--color-accent"],
  },
  {
    name: "表面变量",
    description: "纸面、托盘、内嵌层的明确区分，可以在不依赖厚重边框和重复卡片的前提下建立层级。",
    tokens: [
      "--color-surface-base",
      "--color-surface-panel",
      "--color-surface-inset",
      "--rule-default",
    ],
  },
  {
    name: "节奏变量",
    description: "统一的间距刻度负责对齐壳层密度、页面留白和内容分组节奏。",
    tokens: ["--space-2", "--space-4", "--space-6", "--space-8"],
  },
  {
    name: "圆角与深度",
    description:
      "主面板、托盘、导航轨和工具层要使用不同的圆角与深度，不让整个壳层塌成一种泛用表面。",
    tokens: ["--radius-sm", "--radius-lg", "--shadow-1", "--shadow-3"],
  },
  {
    name: "字体与宽度",
    description:
      "标题字体、界面字体、等宽字体、阅读宽度和壳层宽度共同定义工作台的语言气质与结构边界。",
    tokens: ["--font-display", "--font-ui", "--measure-reading", "--container-shell"],
  },
];
