export type PublicEnv = {
  appUrl: string;
};

export function getPublicEnv(): PublicEnv {
  return {
    appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  };
}

export function getMetadataBase(): URL {
  const { appUrl } = getPublicEnv();

  try {
    return new URL(appUrl);
  } catch {
    return new URL("http://localhost:3000");
  }
}
