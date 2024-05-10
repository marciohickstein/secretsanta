"use strict"

require('module-alias/register');

const { getRootPath, resolvePath } = require('@utils/util')
const { JSONDataSource } = require('@classes/jsonDataSource');

const fileEventData = process.env.TEST >= Number("0") ? `${getRootPath()}/data/events-test-${process.env.TEST}.json` : `${getRootPath()}/data/events.json`;

this.dataEvents = new JSONDataSource(resolvePath(fileEventData));

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