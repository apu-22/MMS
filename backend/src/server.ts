import app from './app';
import { env } from './config/env';

const server = app.listen(env.PORT, () => {
  console.log(`[Server] Mess Management Backend is listening on port ${env.PORT}`);
  console.log(`[Server] Health check available at: http://localhost:${env.PORT}/api/health`);
});

process.on('SIGTERM', () => {
  console.log('[Server] SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('[Server] Process terminated.');
  });
});
