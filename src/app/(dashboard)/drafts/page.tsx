import { DashboardSectionPage } from "@/components/layout/dashboard-section-page";

export default function DraftsPage(): React.JSX.Element {
  return (
    <DashboardSectionPage
      description="这个壳层为成稿详情、改写控制和包装预览预留了稳定布局，等待线程 4 的功能模块直接接入。"
      eyebrow="线程 4 / 成稿"
      highlights={[
        "工作台框架在所有分区之间共享。",
        "占位内容刻意不预设改写或包装状态。",
        "该路由已经可以承接功能级组合。",
      ]}
      title="成稿工作区"
    />
  );
}
