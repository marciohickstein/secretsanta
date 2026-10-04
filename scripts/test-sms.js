"use strict";

const sms = require('../src/utils/smsSender');

const to = process.argv[2];
const subject = process.argv[3] || 'Amigo Secreto';
const message = process.argv[4] || 'Teste de envio via SMS Gateway for Android.';

if (!to) {
    console.log('Uso: node scripts/test-sms.js <celular> [assunto] [mensagem]');
    process.exit(1);
}

(async () => {
    console.log(`Enviando SMS para ${to}...`);
    await sms.send(to, subject, message);
    console.log('Finalizado. Confira o log acima e o celular de destino.');
})();
