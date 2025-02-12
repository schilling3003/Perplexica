import { startWebSocketServer } from './websocket';
import express from 'express';
import cors from 'cors';
import http from 'http';
import routes from './routes';
import { getPort } from './config';
import logger from './utils/logger';

const port = getPort();
const app = express();
const server = http.createServer(app);

// CORS configuration
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    // Add any other frontend URLs you need to support
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD', 'PATCH'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With', 
    'Accept',
    'Connection',
    'Upgrade',
    'Sec-WebSocket-Key',
    'Sec-WebSocket-Version'
  ],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 600
};

// Apply CORS middleware
app.use(cors(corsOptions));

// Enable pre-flight requests for all routes
app.options('*', cors(corsOptions));

// Regular middleware
app.use(express.json());
app.use('/api', routes);

app.get('/api', (_, res) => {
  res.status(200).json({ status: 'ok' });
});

server.listen(port, () => {
  logger.info(`Server is running on port ${port}`);
});

startWebSocketServer(server);

process.on('uncaughtException', (err, origin) => {
  logger.error(`Uncaught Exception at ${origin}: ${err}`);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
});

// Add basic error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error(`Error: ${err.message}`);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});
