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
    <nav aria-label="工作区分区导航" className="dashboard-nav">
      <ul className="dashboard-nav__list">
        {items.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <li className="dashboard-nav__item" key={item.href}>
              <Link
                aria-current={isActive ? "page" : undefined}
                className={cx("dashboard-nav__link", isActive && "is-active")}
                href={item.href}
              >
                <span className="dashboard-nav__index">{item.indexLabel}</span>
                <span className="dashboard-nav__body">
                  <strong>{item.title}</strong>
                  <small>{item.description}</small>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
