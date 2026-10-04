"use strict"

const { randomUUID } = require("crypto");
const { getDatabase } = require('../db/database');

const TABLE_NAME = /^[A-Za-z_][A-Za-z0-9_]*$/;
const FIELD_NAME = /^[A-Za-z_][A-Za-z0-9_]*$/;

/*
 * Armazena cada registro como um documento JSON em uma tabela (id, data),
 * mantendo a mesma interface do antigo JSONDataSource.
 */
class SQLiteDataSource {
	constructor(tableName, db = getDatabase()) {
		if (!tableName || !TABLE_NAME.test(tableName)) {
			throw new Error(`Nome de tabela inválido: ${tableName}`);
		}

		this._table = tableName;
		this._db = db;

		this._db.exec(`CREATE TABLE IF NOT EXISTS ${this._table} (
			id   TEXT PRIMARY KEY,
			data TEXT NOT NULL
		)`);

		this._stmt = {
			all: this._db.prepare(`SELECT data FROM ${this._table} ORDER BY rowid`),
			byId: this._db.prepare(`SELECT data FROM ${this._table} WHERE id = ?`),
			insert: this._db.prepare(`INSERT INTO ${this._table} (id, data) VALUES (?, ?)`),
			update: this._db.prepare(`UPDATE ${this._table} SET data = ? WHERE id = ?`),
			delete: this._db.prepare(`DELETE FROM ${this._table} WHERE id = ?`),
			deleteAll: this._db.prepare(`DELETE FROM ${this._table}`),
		};
	}

	_parse(rows) {
		return rows.map(row => JSON.parse(row.data));
	}

	_findById(id) {
		const row = this._stmt.byId.get(String(id));
		return row ? JSON.parse(row.data) : null;
	}

	async selectById(id) {
		return this.select({ id });
	}

	async select(filter) {
		const filters = filter && typeof filter === 'object' ? Object.entries(filter) : [];

		if (filters.length === 0) {
			return this._parse(this._stmt.all.all());
		}

		const where = [];
		const params = [];

		for (const [field, value] of filters) {
			if (!FIELD_NAME.test(field)) {
				throw new Error(`Campo de filtro inválido: ${field}`);
			}

			if (field === 'id') {
				where.push('id = ?');
				params.push(String(value));
			} else if (value === null) {
				where.push(`json_type(data, '$.${field}') = 'null'`);
			} else if (typeof value === 'object') {
				where.push(`json_extract(data, '$.${field}') = json(?)`);
				params.push(JSON.stringify(value));
			} else {
				where.push(`json_extract(data, '$.${field}') = ?`);
				params.push(typeof value === 'boolean' ? Number(value) : value);
			}
		}

		const rows = this._db
			.prepare(`SELECT data FROM ${this._table} WHERE ${where.join(' AND ')} ORDER BY rowid`)
			.all(...params);

		return this._parse(rows);
	}

	async insertAutoId(item) {
		const newItem = {
			...item,
			id: item?.id ?? randomUUID(),
		};

		this._stmt.insert.run(String(newItem.id), JSON.stringify(newItem));

		return newItem;
	}

	async insert(item, autoId = false) {
		if (autoId || item?.id === undefined) {
			return this.insertAutoId({ ...item, id: undefined });
		}

		return this.insertAutoId(item);
	}

	/*
	 * onlyIf: funcao opcional avaliada dentro da transacao com o registro atual.
	 * Se retornar false, nada e alterado e o metodo retorna null.
	 */
	async update(id, item, { onlyIf } = {}) {
		const altItem = this._db.transaction(() => {
			const current = this._findById(id);

			if (!current) {
				throw new Error(`Item ${id} not found`);
			}

			if (onlyIf && !onlyIf(current)) {
				return null;
			}

			const merged = { ...current, ...item, id: current.id };
			this._stmt.update.run(JSON.stringify(merged), String(id));

			return merged;
		})();

		return altItem;
	}

	async delete(id) {
		const itemRemoved = this._db.transaction(() => {
			const current = this._findById(id);

			if (!current) {
				throw new Error(`Item ${id} not found`);
			}

			this._stmt.delete.run(String(id));

			return current;
		})();

		return itemRemoved;
	}

	async deleteAll() {
		const items = this._db.transaction(() => {
			const all = this._parse(this._stmt.all.all());
			this._stmt.deleteAll.run();
			return all;
		})();

		return items;
	}
}

module.exports = {
	SQLiteDataSource
};
