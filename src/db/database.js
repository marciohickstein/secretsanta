"use strict"

const Database = require('better-sqlite3');
const path = require('path');
const { mkdirSync } = require('fs');
const config = require('../config');

let db = null;

function getDatabase() {
	if (db) return db;

	const file = config.database.file;

	if (file !== ':memory:') {
		mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
	}

	db = new Database(file);
	db.pragma('journal_mode = WAL');
	db.pragma('foreign_keys = ON');

	return db;
}

function closeDatabase() {
	if (db) {
		db.close();
		db = null;
	}
}

module.exports = { getDatabase, closeDatabase };
