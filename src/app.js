"use strict"

require('module-alias/register');

const express = require('express');
const morgan = require('morgan');
const util = require('@utils/util');
const logger = require('@utils/logger');
const routerEvent = require('@routes/eventRoutes');
const routerParticipant = require('@routes/participantRoutes');
const routerWishList = require('@routes/wishlistRoutes');

class AppController {
	constructor() {
		this.express = express();
		this.middleware();
		this.routes();
	}

	middleware() {
		this.express.use(express.json());
		this.express.use(morgan('combined', { stream: logger.stream }));
	}

	routes() {
		this.express.use("/event", routerEvent);
		this.express.use("/participant", routerParticipant);
		this.express.use('/wishlist', routerWishList);

		// Paginas da aplicacao cliente
		this.express.use("/", express.static('client/'));

		//The 404 Route (ALWAYS Keep this as the last route)
		this.express.get(function (req, res) {
			res.sendFile(util.resolvePath(util.getRootPath() + '/client/error404.html'));
		});

		// Middleware de erro global — captura erros assíncronos não tratados
		this.express.use((err, req, res, next) => {
			logger.error(`${req.method} ${req.originalUrl} — ${err.message}`, { stack: err.stack });
			res.status(500).json({ error: true, message: 'Erro interno no servidor.' });
		});
	}
}

module.exports = new AppController().express;