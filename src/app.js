"use strict"

require('module-alias/register');

const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const config = require('@config');
const util = require('@utils/util');
const logger = require('@utils/logger');
const routerEvent = require('@routes/eventRoutes');
const routerParticipant = require('@routes/participantRoutes');
const routerWishList = require('@routes/wishlistRoutes');
const routerWebhook = require('@routes/webhookRoutes');

const CDN = 'https://cdn.jsdelivr.net';

// Log de acesso sem query string (que pode conter tokens de sorteio)
morgan.token('path', (req) => req.originalUrl.split('?')[0]);
const ACCESS_LOG_FORMAT = ':remote-addr - :remote-user [:date[clf]] ":method :path HTTP/:http-version" :status :res[content-length] ":user-agent"';

class AppController {
	constructor() {
		this.express = express();
		this.middleware();
		this.routes();
	}

	middleware() {
		this.express.set('trust proxy', config.app.trustProxy);

		this.express.use(helmet({
			contentSecurityPolicy: {
				directives: {
					defaultSrc: ["'self'"],
					scriptSrc: ["'self'", CDN],
					styleSrc: ["'self'", CDN, "'unsafe-inline'"],
					fontSrc: ["'self'", CDN],
					imgSrc: ["'self'", 'data:'],
					connectSrc: ["'self'"],
					objectSrc: ["'none'"],
					frameAncestors: ["'none'"],
					baseUri: ["'self'"],
					formAction: ["'self'"],
				},
			},
		}));

		// Webhooks precisam do corpo bruto, por isso ficam antes do express.json()
		this.express.use('/webhooks', routerWebhook);

		this.express.use(express.json({ limit: '50kb' }));
		this.express.use(morgan(ACCESS_LOG_FORMAT, { stream: logger.stream }));
	}

	routes() {
		const apiLimiter = rateLimit({
			windowMs: 15 * 60 * 1000,
			limit: config.limits.apiRequestsPer15Min,
			standardHeaders: 'draft-8',
			legacyHeaders: false,
			message: { error: true, message: 'Muitas requisições. Tente novamente mais tarde.' },
		});

		this.express.use("/event", apiLimiter, routerEvent);
		this.express.use("/participant", apiLimiter, routerParticipant);
		this.express.use('/wishlist', apiLimiter, routerWishList);

		// Paginas da aplicacao cliente
		this.express.use("/", express.static('client/'));

		// 404 (manter sempre como ultima rota)
		this.express.use((req, res) => {
			if (req.accepts(['html', 'json']) === 'json' || /^\/(event|participant|wishlist|webhooks)\b/.test(req.path)) {
				return res.status(404).json({ error: true, message: 'Recurso não encontrado.' });
			}

			res.status(404).sendFile(util.resolvePath(util.getRootPath() + '/client/error404.html'));
		});

		// Middleware de erro global — captura erros assíncronos não tratados
		this.express.use((err, req, res, next) => {
			const status = err.status || err.statusCode || 500;

			if (status < 500) {
				const message = err.name === 'ValidationError' ? err.message : 'Requisição inválida.';
				return res.status(status).json({ error: true, message });
			}

			logger.error(`${req.method} ${req.path} — ${err.message}`, { stack: err.stack });
			res.status(500).json({ error: true, message: 'Erro interno no servidor.' });
		});
	}
}

module.exports = new AppController().express;
