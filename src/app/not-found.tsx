import Link from "next/link";

import { EmptyState } from "@/components/ui/empty-state";

export default function NotFoundPage(): React.JSX.Element {
  return (
    <main className="state-shell">
      <EmptyState
        actions={
          <div className="action-row">
            <Link className="button-link" href="/">
              Go Home
            </Link>
            <Link className="button-link button-link--secondary" href="/topics">
              Open Dashboard
            </Link>
          </div>
        }
        description="The route exists outside the current Thread 1 scaffold, or the URL is incorrect."
        eyebrow="404"
        title="Page not found"
      />
    </main>
  );
}
