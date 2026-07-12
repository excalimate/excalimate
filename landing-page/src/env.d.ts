declare namespace Cloudflare {
  interface Env {
    ASSETS: Fetcher;
    GITHUB_APP_ID: string;
    GITHUB_APP_INSTALLATION_ID: string;
    GITHUB_APP_PRIVATE_KEY: string;
    GITHUB_APP_BOT_LOGIN: string;
    GITHUB_REPOSITORY_OWNER: string;
    GITHUB_REPOSITORY_NAME: string;
    FEEDBACK_COOKIE_SECRET: string;
    TURNSTILE_SECRET_KEY: string;
    TURNSTILE_SITE_KEY: string;
    TURNSTILE_ALLOWED_HOSTNAMES: string;
    FEEDBACK_SUBMISSION_RATE_LIMITER: RateLimit;
    FEEDBACK_INTERACTION_RATE_LIMITER: RateLimit;
  }
}
