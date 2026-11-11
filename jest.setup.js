// Os testes nunca enviam notificacoes reais
process.env.NOTIFY_EMAIL = 'false';
process.env.NOTIFY_WHATSAPP = 'false';
process.env.NOTIFY_SMS = 'false';
process.env.APP_URL = 'http://localhost:3333';

// A senha de acesso do .env local nao vale nos testes (o access-gate.test.js liga a sua propria)
process.env.ACCESS_GATE_ENABLED = 'false';
process.env.ACCESS_PASSWORD = '';

require('dotenv').config({ quiet: true });
