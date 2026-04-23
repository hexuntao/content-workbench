"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import type { DashboardNavItem } from "@/lib/navigation";
import { cx } from "@/lib/utils/cx";

type DashboardNavProps = {
  items: DashboardNavItem[];
};

export function DashboardNav({ items }: DashboardNavProps): React.JSX.Element {
  const pathname = usePathname();

  return (
    <nav aria-label="Dashboard sections" className="dashboard-nav">
      <ul className="dashboard-nav__list">
        {items.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <li className="dashboard-nav__item" key={item.href}>
              <Link className={cx("dashboard-nav__link", isActive && "is-active")} href={item.href}>
                <span>{item.title}</span>
                <small>{item.description}</small>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
