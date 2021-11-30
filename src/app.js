"use strict"

require('module-alias/register');

const express = require('express');
const morgan = require('morgan');
const util = require('@utils/util');
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
		this.express.use(morgan('combined'));
	}

	routes() {
		this.express.use("/event", routerEvent);
		this.express.use("/participant", routerParticipant);
		this.express.use('/wishlist', routerWishList);

		// Paginas da aplicacao cliente
		this.express.use("/", express.static('client/'));

		//The 404 Route (ALWAYS Keep this as the last route)
		this.express.get('*', function (req, res) {
			res.sendFile(util.resolvePath(util.getRootPath() + '/client/error404.html'));
		});
	}
}

module.exports = new AppController().express;