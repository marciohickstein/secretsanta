"use strict"

require('module-alias/register');

const app = require('@app');
const config = require('@config');

app.listen(config.app.port, () => {
	console.log(`Server running on ${config.app.port}`)
})