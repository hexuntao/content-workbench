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
      <p className="eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      <p>{description}</p>
      {actions ? actions : null}
    </section>
  );
}
