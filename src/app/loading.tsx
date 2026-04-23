import { LoadingView } from "@/components/ui/loading-view";

export default function RootLoadingPage(): React.JSX.Element {
  return (
    <LoadingView
      description="正在准备编辑台壳层、共享路由框架和工作区表面语言。"
      eyebrow="加载共享壳层"
      title="正在打开内容工作台"
    />
  );
}
