"use strict"

const { createLogger, format, transports } = require('winston');
const path = require('path');
const fs = require('fs');

const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir);

const logger = createLogger({
	level: 'info',
	format: format.combine(
		format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
		format.errors({ stack: true }),
		format.json()
	),
	transports: [
		new transports.File({
			filename: path.join(logsDir, 'error.log'),
			level: 'error',
		}),
		new transports.File({
			filename: path.join(logsDir, 'combined.log'),
		}),
	],
});

if (process.env.NODE_ENV !== 'production') {
	logger.add(new transports.Console({
		format: format.combine(
			format.colorize(),
			format.printf(({ timestamp, level, message, stack }) =>
				`${timestamp} [${level}]: ${stack || message}`
			)
		),
	}));
}

// Stream compatível com morgan
logger.stream = {
	write: (message) => logger.info(message.trimEnd()),
};

module.exports = logger;
