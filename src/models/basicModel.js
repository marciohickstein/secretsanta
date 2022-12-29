
"use strict"

require('module-alias/register');

const { getRootPath, resolvePath } = require('@utils/util')
const { JSONDataSource } = require('@classes/jsonDataSource');

function BasicModel(fileEventData) {
	this.readData = async function(){
		this.data = new JSONDataSource(resolvePath(fileEventData));
	};
	this.get = async function(id = '') {
		const filter = id !== '' ? { id } : {};
		return await this.data.select(filter);
	};
	this.create = async function(event) {
		return await this.data.insertAutoId(event);
	};
	this.delete = async function(id) {
		return await this.data.delete(id);
	};
	this.update = async function(id, event) {
		return await this.data.update(id, event);
	};
}

module.exports = BasicModel;