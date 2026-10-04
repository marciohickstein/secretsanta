"use strict"

require('module-alias/register');

const { SQLiteDataSource } = require('@classes/sqliteDataSource');

function BasicModel(tableName) {
	this.data = new SQLiteDataSource(tableName);

	this.get = async function(id = '') {
		const filter = id !== '' ? { id } : {};
		return await this.data.select(filter);
	};
	this.create = async function(item) {
		return await this.data.insertAutoId(item);
	};
	this.delete = async function(id) {
		return await this.data.delete(id);
	};
	this.update = async function(id, item) {
		return await this.data.update(id, item);
	};
}

module.exports = BasicModel;
