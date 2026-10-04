"use strict";

// Importa os dados dos antigos arquivos JSON (data/*.json) para o SQLite.
// Uso: node scripts/migrate-json-to-sqlite.js [diretorio-dos-json]

const path = require('path');
const { readFileSync, existsSync } = require('fs');
const config = require('../src/config');
const { getDatabase, closeDatabase } = require('../src/db/database');
const { SQLiteDataSource } = require('../src/classes/sqliteDataSource');

const dataDir = path.resolve(process.argv[2] || 'data');
const collections = ['events', 'participants', 'wishlist'];

const db = getDatabase();
console.log(`Banco: ${path.resolve(config.database.file)}`);

for (const table of collections) {
	const file = path.join(dataDir, `${table}.json`);

	if (!existsSync(file)) {
		console.log(`${table}: ${file} não encontrado, ignorado.`);
		continue;
	}

	const records = JSON.parse(readFileSync(file, 'utf8') || '[]');
	new SQLiteDataSource(table, db); // garante a tabela
	const insert = db.prepare(`INSERT OR IGNORE INTO ${table} (id, data) VALUES (?, ?)`);

	const imported = db.transaction(() => {
		let count = 0;
		for (const record of records) {
			if (record?.id === undefined || record?.id === null) continue;
			count += insert.run(String(record.id), JSON.stringify(record)).changes;
		}
		return count;
	})();

	const total = db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n;
	console.log(`${table}: ${imported} de ${records.length} registros importados (total na tabela: ${total}).`);
}

closeDatabase();
