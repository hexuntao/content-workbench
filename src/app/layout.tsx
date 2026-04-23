import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import "@/styles/globals.css";
import { getMetadataBase } from "@/lib/env/public-env";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: getMetadataBase(),
  title: {
    default: siteConfig.name,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
};

export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#f4efe6",
};

type RootLayoutProps = Readonly<{
  children: ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps): React.JSX.Element {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
