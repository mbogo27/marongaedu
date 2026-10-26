// Runs in every test worker before the test files.
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? "postgresql://maronga@localhost:5433/maronga_test";
process.env.AUTH_SECRET = "test-secret-test-secret-test-secret-123";
process.env.APP_URL = "http://localhost:3000";
process.env.EMAIL_PROVIDER = "console";
process.env.STORAGE_PROVIDER = "local";
process.env.STORAGE_LOCAL_DIR = ".storage-test";
process.env.RATE_LIMIT_PROVIDER = "memory";
process.env.PAYMENTS_MODE = "simulated";
(process.env as Record<string, string>).NODE_ENV = "test";
