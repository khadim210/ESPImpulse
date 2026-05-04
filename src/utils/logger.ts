type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const isDev = import.meta.env.DEV;

const LOG_COLORS: Record<LogLevel, string> = {
  debug: '#888',
  info: '#2196F3',
  warn: '#FF9800',
  error: '#F44336'
};

const createLogger = (category: string) => {
  const log = (level: LogLevel, ...args: unknown[]) => {
    if (!isDev && level !== 'error') return;

    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    const color = LOG_COLORS[level];

    if (level === 'error') {
      console.error(`%c[${timestamp}] [${category}]`, `color: ${color}`, ...args);
    } else if (level === 'warn') {
      console.warn(`%c[${timestamp}] [${category}]`, `color: ${color}`, ...args);
    } else {
      console.log(`%c[${timestamp}] [${category}]`, `color: ${color}`, ...args);
    }
  };

  return {
    debug: (...args: unknown[]) => log('debug', ...args),
    info: (...args: unknown[]) => log('info', ...args),
    warn: (...args: unknown[]) => log('warn', ...args),
    error: (...args: unknown[]) => log('error', ...args)
  };
};

export const logger = {
  ai: createLogger('AI'),
  auth: createLogger('AUTH'),
  db: createLogger('DB'),
  api: createLogger('API'),
  app: createLogger('APP'),
  eval: createLogger('EVAL'),
  export: createLogger('EXPORT')
};

export default logger;
