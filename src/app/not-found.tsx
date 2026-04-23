import Link from "next/link";

import { EmptyState } from "@/components/ui/empty-state";

export default function NotFoundPage(): React.JSX.Element {
  return (
    <main className="state-shell" id="main-content">
      <EmptyState
        actions={
          <div className="action-row">
            <Link className="button-link" href="/">
              返回首页
            </Link>
            <Link className="button-link button-link--secondary" href="/topics">
              打开工作台
            </Link>
          </div>
        }
        description="这个地址不在当前共享壳层范围内，或者链接本身已经失效。"
        eyebrow="404"
        title="这个页面不在当前工作台中"
      />
    </main>
  );
}
