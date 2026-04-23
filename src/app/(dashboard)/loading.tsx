import { LoadingView } from "@/components/ui/loading-view";

export default function DashboardLoadingPage(): React.JSX.Element {
  return (
    <LoadingView
      description="正在准备该分区的导航轨、页头和共享内容框架。"
      eyebrow="加载工作区"
      title="正在打开分区"
    />
  );
}
