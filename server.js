"use strict"

// O better-sqlite3 13 exige Node 22+; em versoes antigas o processo cai sem mensagem (segmentation fault)
const MIN_NODE_MAJOR = 22;
const nodeMajor = Number(process.versions.node.split('.')[0]);

if (nodeMajor < MIN_NODE_MAJOR) {
	console.error(`Node ${process.versions.node} não é suportado: use Node ${MIN_NODE_MAJOR} ou mais novo (recomendado: 24, veja .nvmrc).`);
	process.exit(1);
}

require('module-alias/register');

const app = require('@app');
const config = require('@config');
const { closeDatabase } = require('./src/db/database');

const server = app.listen(config.app.port, () => {
	console.log(`Server running on ${config.app.port}`)
})

// Encerramento limpo (docker stop / Ctrl+C): para de aceitar conexoes e fecha o SQLite (checkpoint do WAL)
function shutdown(signal) {
	console.log(`${signal} recebido, encerrando...`);
	server.close(() => {
		closeDatabase();
		process.exit(0);
	});
	// Conexoes keep-alive podem segurar o close; forca a saida apos 8s
	setTimeout(() => {
		closeDatabase();
		process.exit(0);
	}, 8000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));