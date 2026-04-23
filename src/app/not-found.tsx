import Link from "next/link";

import { EmptyState } from "@/components/ui/empty-state";

export default function NotFoundPage(): React.JSX.Element {
  return (
    <main className="state-shell" id="main-content">
      <EmptyState
        actions={
          <div className="action-row">
            <Link className="button-link" href="/">
              Return Home
            </Link>
            <Link className="button-link button-link--secondary" href="/topics">
              Open the Desk
            </Link>
          </div>
        }
        description="The route is outside the current shared shell, or the address is incorrect."
        eyebrow="404"
        title="This page is not on the desk"
      />
    </main>
  );
}
