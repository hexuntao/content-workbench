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
      actionLabel="Retry Render"
      description="The application shell hit an unexpected error while composing the page."
      onAction={reset}
      title="Unable to render this view"
    />
  );
}
