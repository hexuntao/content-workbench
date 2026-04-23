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
      <body>
        <ErrorView
          actionLabel="Reload Shell"
          description="A root-level error interrupted the application shell before the page could load."
          onAction={reset}
          title="Application shell failed"
        />
      </body>
    </html>
  );
}
