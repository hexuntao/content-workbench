import type { ReactNode } from "react";

import { AppShell } from "@/components/layout/app-shell";

type DashboardLayoutProps = Readonly<{
  children: ReactNode;
}>;

export default function DashboardLayout({ children }: DashboardLayoutProps): React.JSX.Element {
  return <AppShell>{children}</AppShell>;
}
