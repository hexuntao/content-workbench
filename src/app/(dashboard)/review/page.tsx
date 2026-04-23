import { DashboardSectionPage } from "@/components/layout/dashboard-section-page";

export default function ReviewPage(): React.JSX.Element {
  return (
    <DashboardSectionPage
      description="审核分区已经拥有独立路由壳，但具体状态流转和队列行为仍然不属于线程 1 的负责范围。"
      eyebrow="线程 5 / 审核"
      highlights={[
        "共享页面骨架已经挂载完成。",
        "这里不实现审核任务的业务状态跳转。",
        "后续线程可以直接把队列和详情视图接进来。",
      ]}
      title="审核工作区"
    />
  );
}
