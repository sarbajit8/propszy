const { app } = require('./app');
const { env } = require('./config/env');
const { prisma } = require('./config/prisma');
const { autoBootstrap } = require('./services/bootstrap');

async function start() {
  try {
    await prisma.$connect();
    // eslint-disable-next-line no-console
    console.log('[db] connected');
    await autoBootstrap();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[db] connection failed:', err.message);
    process.exit(1);
  }

  const server = app.listen(env.port, () => {
    // eslint-disable-next-line no-console
    console.log(`[api] http://localhost:${env.port}${env.apiPrefix}  (${env.nodeEnv})`);
  });

  const shutdown = async (sig) => {
    // eslint-disable-next-line no-console
    console.log(`\n[api] ${sig} — shutting down`);
    server.close(async () => {
      await prisma.$disconnect();
      process.exit(0);
    });
  };
  ['SIGINT', 'SIGTERM'].forEach((s) => process.on(s, () => shutdown(s)));
}

start();
