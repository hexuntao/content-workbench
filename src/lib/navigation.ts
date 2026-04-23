export type DashboardRoute = "/topics" | "/drafts" | "/review" | "/publish" | "/settings";

export type DashboardNavItem = {
  indexLabel: string;
  href: DashboardRoute;
  title: string;
  description: string;
  owner: string;
};

export const dashboardNavItems: DashboardNavItem[] = [
  {
    indexLabel: "01",
    href: "/topics",
    title: "Topics",
    description: "Topic discovery and shortlist shell",
    owner: "Thread 3",
  },
  {
    indexLabel: "02",
    href: "/drafts",
    title: "Drafts",
    description: "Draft detail and rewrite shell",
    owner: "Thread 4",
  },
  {
    indexLabel: "03",
    href: "/review",
    title: "Review",
    description: "Review queue and decision shell",
    owner: "Thread 5",
  },
  {
    indexLabel: "04",
    href: "/publish",
    title: "Publish",
    description: "Packaging and export shell",
    owner: "Thread 5",
  },
  {
    indexLabel: "05",
    href: "/settings",
    title: "Settings",
    description: "Shared configuration shell",
    owner: "Shared",
  },
];
