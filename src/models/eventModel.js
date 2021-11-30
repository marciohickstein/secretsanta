"use strict"

require('module-alias/register');

const { getRootPath, resolvePath } = require('@utils/util')
const { JSONDataSource } = require('@classes/jsonDataSource');

this.dataEvents = new JSONDataSource();

const fileEventData = process.env.TEST === "1" ? `${getRootPath()}/data/events-test.json` : `${getRootPath()}/data/events.json`;

this.dataEvents.open(resolvePath(fileEventData));

const EventModel = {
	get: async (id = '') => {
		const filter = id !== '' ? { id } : {};
		return await this.dataEvents.select(filter);
	},
	create: async (event) => {
		return await this.dataEvents.insertAutoId(event);
	},
	delete: async (id) => {
		return await this.dataEvents.delete(id);
	},
	update: async (id, event) => {
		return await this.dataEvents.update(id, event);
	}
}

module.exports = EventModel;