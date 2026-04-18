type UmamiConfig = {
  scriptOrigin: string;
  scriptUrl: string;
  websiteId: string;
};

type EnvSource = Record<string, string | undefined>;

const getEnvValue = (value: string | undefined) => value?.trim();

export function getUmamiConfig(env: EnvSource = process.env): UmamiConfig | null {
  const websiteId = getEnvValue(env.NEXT_PUBLIC_UMAMI_WEBSITE_ID);
  const scriptUrlValue = getEnvValue(env.NEXT_PUBLIC_UMAMI_SCRIPT_URL);

  if (!websiteId || !scriptUrlValue) {
    return null;
  }

  try {
    const scriptUrl = new URL(scriptUrlValue);

    return {
      scriptOrigin: scriptUrl.origin,
      scriptUrl: scriptUrl.toString(),
      websiteId,
    };
  } catch {
    return null;
  }
}
