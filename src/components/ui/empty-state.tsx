import type { ReactNode } from "react";

type EmptyStateProps = {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
};

export function EmptyState({
  eyebrow,
  title,
  description,
  actions,
}: EmptyStateProps): React.JSX.Element {
  return (
    <section className="empty-state">
      <div className="empty-state__marker" />
      <div className="empty-state__body">
        <p className="meta-label">{eyebrow}</p>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {actions ? <div className="empty-state__actions">{actions}</div> : null}
    </section>
  );
}
