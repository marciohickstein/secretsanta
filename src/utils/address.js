"use strict"

const UFS = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];

/* Ex.: "Rua das Flores, 260, Apto 3 - Centro - Porto Alegre/RS - CEP 90000-000" */
function formatStreetAddress(a) {
	const street = [a.street, a.number, a.complement].filter(Boolean).join(', ');
	return [street, a.district, `${a.city}/${a.state}`, `CEP ${a.cep}`].filter(Boolean).join(' - ');
}

/* Texto do local exibido nos e-mails e paginas, com o nome do local na frente quando houver */
const formatAddress = (a) => `${a.place ? `${a.place} — ` : ''}${formatStreetAddress(a)}`;

/* Link do Google Maps para o local do evento (eventos antigos tem apenas o texto livre) */
function mapUrl(event) {
	const query = event.address ? formatStreetAddress(event.address) : event.location;
	return query ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}` : null;
}

module.exports = { UFS, formatAddress, mapUrl };
