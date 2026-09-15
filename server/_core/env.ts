export const ENV = {
  appId: process.env.VITE_APP_ID || "citycare",
  cookieSecret: process.env.JWT_SECRET || "citycare_super_secret_jwt_key_2026",
  databaseUrl:
    process.env.DATABASE_URL ||
    "postgresql://postgres:manasvig%40123@db.urfvhizrdtqfsifqvokz.supabase.co:5432/postgres",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL || "",
  ownerOpenId: process.env.OWNER_OPEN_ID || "admin-01",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL || "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY || "",
};
