// Os testes nunca enviam notificacoes reais
process.env.NOTIFY_EMAIL = 'false';
process.env.NOTIFY_WHATSAPP = 'false';
process.env.NOTIFY_SMS = 'false';
process.env.APP_URL = 'http://localhost:3333';

require('dotenv').config({ quiet: true });
