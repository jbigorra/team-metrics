export interface AppConfig {
  bitbucket: {
    workspace: string;
    apiKey: string;
    baseUrl: string;
  };
  repositories: string[];
  onedrive: {
    filePath: string;
    tenantId?: string;
    clientId?: string;
    clientSecret?: string;
  };
  timeRangeDays: number;
}

const requiredEnvVars = [
  "BITBUCKET_WORKSPACE",
  "BITBUCKET_API_KEY",
  "ONEDRIVE_FILE_PATH",
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

export const appConfig: AppConfig = {
  bitbucket: {
    workspace: process.env.BITBUCKET_WORKSPACE!,
    apiKey: process.env.BITBUCKET_API_KEY!,
    baseUrl: "https://api.bitbucket.org/2.0",
  },
  repositories: [
    "verychic-lambdas",
    "verychic-web-apps",
    "verychic",
    "verychic-web",
    "search-etl",
    "verychic-serverless",
    "search-api",
    "verychic-e2e-tests",
    "verychic_backoffice",
    "verychic-commons",
    "search_engine",
  ],
  onedrive: {
    filePath: process.env.ONEDRIVE_FILE_PATH!,
    tenantId: process.env.AZURE_TENANT_ID,
    clientId: process.env.AZURE_CLIENT_ID,
    clientSecret: process.env.AZURE_CLIENT_SECRET,
  },
  timeRangeDays: 7,
};

console.log("appConfig", appConfig);