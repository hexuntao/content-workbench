"use client";

import { ErrorView } from "@/components/ui/error-view";

type GlobalErrorPageProps = {
  error: Error & {
    digest?: string;
  };
  reset: () => void;
};

export default function GlobalErrorPage({ error, reset }: GlobalErrorPageProps): React.JSX.Element {
  console.error(error);

  return (
    <html lang="zh-CN">
      <body className="app-body">
        <div className="app-canvas">
          <ErrorView
            actionLabel="重新加载壳层"
            description="页面尚未载入前，根级错误已经中断了应用壳层。"
            onAction={reset}
            title="应用壳层加载失败"
          />
        </div>
      </body>
    </html>
  );
}
