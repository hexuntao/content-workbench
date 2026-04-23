import assert from "node:assert/strict";
import test from "node:test";

import { getMetadataBase, getPublicEnv } from "./env/public-env.ts";
import { dashboardNavItems } from "./navigation.ts";

test("dashboard routes stay unique", (): void => {
  const hrefs = dashboardNavItems.map((item) => item.href);
  const uniqueHrefs = new Set(hrefs);

  assert.equal(uniqueHrefs.size, hrefs.length);
});

test("public env falls back to localhost", (): void => {
  const previousAppUrl = process.env.NEXT_PUBLIC_APP_URL;

  delete process.env.NEXT_PUBLIC_APP_URL;

  try {
    assert.equal(getPublicEnv().appUrl, "http://localhost:3000");
    assert.equal(getMetadataBase().toString(), "http://localhost:3000/");
  } finally {
    if (typeof previousAppUrl === "string") {
      process.env.NEXT_PUBLIC_APP_URL = previousAppUrl;
    } else {
      delete process.env.NEXT_PUBLIC_APP_URL;
    }
  }
});
