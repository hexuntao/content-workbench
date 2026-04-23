import { DashboardSectionPage } from "@/components/layout/dashboard-section-page";

export default function PublishPage(): React.JSX.Element {
  return (
    <DashboardSectionPage
      description="发布分区已经拥有统一的工作台框架，等待线程 5 与线程 6 接入导出流程和远端草稿相关表面。"
      eyebrow="线程 5 / 发布"
      highlights={[
        "布局与导航已经就位。",
        "共享壳层中没有写死任何发布流程假设。",
        "后续可以直接挂载功能模块，无需再搬动共享代码。",
      ]}
      title="发布工作区"
    />
  );
}
