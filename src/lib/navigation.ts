export type DashboardRoute = "/topics" | "/drafts" | "/review" | "/publish" | "/settings";

export type DashboardNavItem = {
  indexLabel: string;
  href: DashboardRoute;
  title: string;
  description: string;
  owner: string;
};

export const dashboardNavItems: DashboardNavItem[] = [
  {
    indexLabel: "01",
    href: "/topics",
    title: "选题",
    description: "选题发现、筛选与候选池壳层",
    owner: "线程 3",
  },
  {
    indexLabel: "02",
    href: "/drafts",
    title: "成稿",
    description: "母稿详情、改写与版本操作壳层",
    owner: "线程 4",
  },
  {
    indexLabel: "03",
    href: "/review",
    title: "审核",
    description: "审核队列与决策操作壳层",
    owner: "线程 5",
  },
  {
    indexLabel: "04",
    href: "/publish",
    title: "发布",
    description: "包装、导出与发布准备壳层",
    owner: "线程 5",
  },
  {
    indexLabel: "05",
    href: "/settings",
    title: "设置",
    description: "共享配置与环境管理壳层",
    owner: "共享",
  },
];
