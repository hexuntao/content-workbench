export type DashboardRoute = "/topics" | "/drafts" | "/review" | "/publish" | "/settings";

export type DashboardNavItem = {
  href: DashboardRoute;
  title: string;
  description: string;
  owner: string;
};

export const dashboardNavItems: DashboardNavItem[] = [
  {
    href: "/topics",
    title: "Topics",
    description: "Topic discovery and shortlist shell",
    owner: "Thread 3",
  },
  {
    href: "/drafts",
    title: "Drafts",
    description: "Draft detail and rewrite shell",
    owner: "Thread 4",
  },
  {
    href: "/review",
    title: "Review",
    description: "Review queue and decision shell",
    owner: "Thread 5",
  },
  {
    href: "/publish",
    title: "Publish",
    description: "Packaging and export shell",
    owner: "Thread 5",
  },
  {
    href: "/settings",
    title: "Settings",
    description: "Shared configuration shell",
    owner: "Shared",
  },
];
