// Tests must never depend on whoever's .env happens to be sitting in the project. Everything the
// suite relies on is pinned here: no network, no API key, no Firestore, no background worker.
process.env.AI_PROVIDER = 'mock';
process.env.STORE = 'memory';
process.env.WORKER_ENABLED = 'false';
process.env.ENABLE_DEV_ROUTES = 'true';
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'silent';
