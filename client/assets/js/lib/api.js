// #######################################################
// Chamadas HTTP para a API (mesma origem)
// Em caso de erro lanca { status, data, message }; status 0 = sem conexao.
// #######################################################

export async function api(path, { method = 'GET', body, headers = {} } = {}) {
	let response;

	try {
		response = await fetch(path, {
			method,
			credentials: 'same-origin',
			headers: {
				Accept: 'application/json',
				...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
				...headers,
			},
			body: body !== undefined ? JSON.stringify(body) : undefined,
		});
	} catch {
		throw apiError(0, null);
	}

	const data = await response.json().catch(() => null);
	if (!response.ok) throw apiError(response.status, data);
	return data;
}

function apiError(status, data) {
	const error = new Error((data && data.message) || `Erro ${status}`);
	error.status = status;
	error.data = data;
	return error;
}

/* Mensagem do servidor ou um texto padrao */
export const errorText = (err, fallback = 'Não foi possível falar com o servidor. Verifique sua conexão e tente novamente.') =>
	(err && err.data && err.data.message) || fallback;

const enc = encodeURIComponent;

export const events = {
	create: (event) => api('/event', { method: 'POST', body: event }),
	get: (id) => api(`/event/${enc(id)}`),
};

export const organizer = (eventId, token) => {
	const base = `/event/${enc(eventId)}/organizer`;
	const headers = { 'X-Admin-Token': token || '' };

	return {
		get: () => api(base, { headers }),
		draw: () => api(`${base}/draw`, { method: 'POST', body: {}, headers }),
		resend: (participantId, channel = 'email') =>
			api(`${base}/participants/${enc(participantId)}/resend`, { method: 'POST', body: { channel }, headers }),
		update: (participantId, data) =>
			api(`${base}/participants/${enc(participantId)}`, { method: 'PATCH', body: data, headers }),
	};
};

export const participants = {
	get: (id) => api(`/participant/${enc(id)}`),
	suggestions: (id) => api(`/participant/${enc(id)}/suggestions`),
};

export const wishlists = {
	get: (id) => api(`/wishlist/${enc(id)}`),
	save: (id, token, wishlist) => api(`/wishlist/${enc(id)}`, { method: 'PUT', body: { wishlist }, headers: { 'X-Edit-Token': token || '' } }),
};

export const address = {
	lookupCep: (cep) => api(`/address/cep/${enc(cep)}`),
};
