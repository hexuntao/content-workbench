"use client";

import { useEffect } from "react";

import { ErrorView } from "@/components/ui/error-view";

type RootErrorPageProps = {
  error: Error & {
    digest?: string;
  };
  reset: () => void;
};

export default function RootErrorPage({ error, reset }: RootErrorPageProps): React.JSX.Element {
  useEffect((): void => {
    console.error(error);
  }, [error]);

  return (
    <ErrorView
      actionLabel="重试渲染"
      description="应用壳层在组合当前页面时遇到了一个未预期错误。"
      onAction={reset}
      title="当前视图无法完成渲染"
    />
  );
}
