import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';

@Injectable()
export class LoggerService implements NestLoggerService {
  /**
   * Write a 'log' level log.
   */
  log(message: any, context?: string) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [LOG] ${context ? `[${context}] ` : ''}${message}`);
  }

  /**
   * Write an 'error' level log.
   */
  error(message: any, trace?: string, context?: string) {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] [ERROR] ${context ? `[${context}] ` : ''}${message}`);
    if (trace) {
      console.error(`[${timestamp}] [ERROR] Stack Trace: ${trace}`);
    }
  }

  /**
   * Write a 'warn' level log.
   */
  warn(message: any, context?: string) {
    const timestamp = new Date().toISOString();
    console.warn(`[${timestamp}] [WARN] ${context ? `[${context}] ` : ''}${message}`);
  }

  /**
   * Write a 'debug' level log.
   */
  debug(message: any, context?: string) {
    const timestamp = new Date().toISOString();
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[${timestamp}] [DEBUG] ${context ? `[${context}] ` : ''}${message}`);
    }
  }

  /**
   * Write a 'verbose' level log.
   */
  verbose(message: any, context?: string) {
    const timestamp = new Date().toISOString();
    if (process.env.NODE_ENV === 'development') {
      console.log(`[${timestamp}] [VERBOSE] ${context ? `[${context}] ` : ''}${message}`);
    }
  }
}
