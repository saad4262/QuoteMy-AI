// Tests never touch the network or a real key.
process.env.AI_PROVIDER = 'mock';
process.env.STORE = 'memory';
process.env.REQUIRE_AUTH = 'false';
process.env.ENABLE_DEV_ROUTES = 'true';
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'silent';
