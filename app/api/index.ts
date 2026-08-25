import { createApp, initialize } from '../src/server.js';

/**
 * The Vercel entry point. Every request the platform receives is rewritten here (vercel.json) and
 * handed to the same Express app that runs locally - there is one app, not a local one and a
 * deployed one that drift apart.
 *
 * Module scope runs once per cold start, so initialize() is paid once per instance and not per
 * request. src/server.ts skips its own listen() when VERCEL is set; the platform owns the port.
 */
initialize();

export default createApp();
