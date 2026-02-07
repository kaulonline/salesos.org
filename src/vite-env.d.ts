/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_SENTRY_DSN: string;
  readonly VITE_STRIPE_PUBLIC_KEY: string;
  readonly VITE_RAZORPAY_KEY_ID: string;
  readonly VITE_APP_ENV: string;
  // Add other env variables as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
