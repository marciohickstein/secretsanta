"use strict";

const email = require('../src/utils/emailSender');

const to = process.argv[2] || 'marcio.hickstein@gmail.com';
const subject = process.argv[3] || 'Teste Resend';
const html = process.argv[4] || '<p>Teste de envio via <strong>Resend</strong>.</p>';

(async () => {
    console.log(`Enviando para ${to}...`);
    await email.send(to, subject, html);
    console.log('Finalizado. Confira o log acima e a caixa de entrada.');
})();
