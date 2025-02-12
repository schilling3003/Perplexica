import winston from 'winston';
import { EventEmitter } from 'events';

const logger = winston.createLogger({
  level: 'info',
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple(),
      ),
    }),
    new winston.transports.File({
      filename: 'app.log',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
      ),
    }),
  ],
});

export class EventLogger extends EventEmitter {
  emit(event: string | symbol, ...args: any[]): boolean {
    logger.info(`Event emitted: ${String(event)}`, { args });
    return super.emit(event, ...args);
  }
}

export const eventEmitter = new EventLogger();
export default logger;
