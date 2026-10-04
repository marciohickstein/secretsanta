#!/bin/bash
# Apaga todos os registros do banco SQLite (DB_FILE ou data/secretsanta.db)
node -e "
const { getDatabase, closeDatabase } = require('./src/db/database');
const db = getDatabase();
for (const t of ['events', 'participants', 'wishlist']) {
	db.exec('CREATE TABLE IF NOT EXISTS ' + t + ' (id TEXT PRIMARY KEY, data TEXT NOT NULL)');
	db.exec('DELETE FROM ' + t);
}
closeDatabase();
console.log('Base limpa.');
"
