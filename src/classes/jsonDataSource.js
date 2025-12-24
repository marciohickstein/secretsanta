"use strict"

const { readFile, writeFile } = require('fs/promises');
const { existsSync } = require('fs');
const { v4: uuidV4 } = require("uuid");

class JSONDataSource {
    constructor(fileName) {
        if (!fileName) {
            throw new Error("Arquivo JSON informado inválido.");
        }

        this._fileName = fileName;

        if (!existsSync(this._fileName)) {
            this.createFile();
        }
    }

    async createFile() {
        if (!this._fileName) {
            throw new Error("Arquivo JSON informado inválido.");
        }

        try {
            const stringJSON = JSON.stringify([]);
            await writeFile(this._fileName, stringJSON);
            return true;
        } catch (error) {
            throw new Error(error);
        }
    }

    async _readFile() {
        if (!this._fileName) {
            throw new Error("Nao foi informado o nome do arquivos JSON.");
        }

        try {
            const data = await readFile(this._fileName);
            return JSON.parse(data.toString());
        } catch (error) {
            throw new Error(error);
        }
    }

    async _writeFile(records) {
        if (!this._fileName) {
            throw new Error("Nao foi informado o nome do arquivos JSON.");
        }

        try {
            const stringJSON = JSON.stringify(records);
            await writeFile(this._fileName, stringJSON);
            return true;
        } catch (error) {
            throw new Error(error);
        }
    }

    _open(string) {
        this._fileName = string;
    }

    async selectById(id) {
        return this.select({ id });
    }

    async select(filter) {
        const items = await this._readFile();
        let selectedItems = items;

        if (filter && typeof filter === 'object') {
            const filters = Object.entries(filter);

            if (Array.isArray(filters)) {
                selectedItems = items.filter(item => {
                    let matched = true;

                    for (const filter of filters) {
                        if (item[filter[0]] === 'undefined' || item[filter[0]] !== filter[1]) {
                            matched = false;
                            break;
                        }
                    }

                    return matched;
                });
            }
        }

        return selectedItems;
    }

    async insertAutoId(item) {
        const items = await this._readFile();

        let newItem = {
            id: uuidV4(),
            ...item
        }
        items.push(newItem);

        const ok = await this._writeFile(items);

        return ok ? newItem : null;
    }

    async insert(item, autoId = false) {
        const items = await this._readFile();
        let newItem = item;

        if (autoId)
            item.id = Date.now();

        items.push(newItem);

        const ok = await this._writeFile(items);

        return ok ? newItem : null;
    }

    async update(id, item) {
        const items = await this._readFile();

        const indexItem = items.findIndex(item => item.id == id);

        if (indexItem === -1) {
            throw new Error(`Item ${id} not found`);
        }

        const altItem = {
            ...items[indexItem],
            ...item
        }

        items.splice(indexItem, 1, altItem);

        const ok = await this._writeFile(items);

        return ok ? altItem : null;
    }

    async delete(id) {
        const items = await this._readFile();

        const indexItem = items.findIndex(item => item.id == id);

        if (indexItem === -1) {
            throw new Error(`Item ${id} not found`);
        }

        const itemRemoved = Object.assign(items[indexItem]);

        items.splice(indexItem, 1);

        const ok = await this._writeFile(items);

        return ok ? itemRemoved : null;
    }

    async deleteAll() {
        const items = await this._readFile();

        await writeFile(this._fileName, '[]', function () { console.log('done') });

        return items;
    }
}

module.exports = {
    JSONDataSource
};