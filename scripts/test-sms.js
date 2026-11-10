"use strict";

const sms = require('../src/utils/smsSender');

const to = process.argv[2];
const subject = process.argv[3] || 'Amigo Secreto';
const message = process.argv[4] || 'Teste de envio via SMS Gateway for Android.';
const WAIT_MS = 5000;

if (!to) {
    console.log('Uso: node scripts/test-sms.js <celular> [assunto] [mensagem]');
    process.exit(1);
}

(async () => {
    console.log(`Enviando SMS para ${to}...`);
    const result = await sms.send(to, subject, message);
    console.log('Resposta do envio:', result);

    if (result && result.id) {
        console.log(`Consultando o status em ${WAIT_MS / 1000}s...`);
        await new Promise(resolve => setTimeout(resolve, WAIT_MS));
        console.log('Status:', await sms.getStatus(result.id));
    }

    console.log('Finalizado. Confira o log e o celular de destino.');
})();
