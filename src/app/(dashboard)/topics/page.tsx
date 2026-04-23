import { DashboardSectionPage } from "@/components/layout/dashboard-section-page";

export default function TopicsPage(): React.JSX.Element {
  return (
    <DashboardSectionPage
      description="共享路由、布局节奏和空状态结构已经就位。线程 3 现在可以在这个分区下直接接入列表、筛选和动作区域，而不需要重做壳层。"
      eyebrow="线程 3 / 选题"
      highlights={[
        "路由壳和导航结构已经稳定。",
        "这里刻意不实现功能级数据加载。",
        "API 与领域状态逻辑仍然归后续线程拥有。",
      ]}
      title="选题工作区"
    />
  );
}
