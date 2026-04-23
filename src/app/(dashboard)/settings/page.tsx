import { DashboardSectionPage } from "@/components/layout/dashboard-section-page";

export default function SettingsPage(): React.JSX.Element {
  return (
    <DashboardSectionPage
      description="设置分区作为稳定的共享入口保留下来，后续可承接环境、渠道或工作区配置视图。"
      eyebrow="共享 / 设置"
      highlights={[
        "保留这个路由是为了让导航结构完整闭环。",
        "线程 1 不引入持久化或环境修改逻辑。",
        "未来的设置面板可以直接叠加在现有壳层之上。",
      ]}
      title="设置工作区"
    />
  );
}
