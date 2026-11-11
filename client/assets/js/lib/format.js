// #######################################################
// Formatacao (datas, dinheiro, textos) em pt-BR
// #######################################################

export const pad = (n) => String(n).padStart(2, '0');

export const onlyDigits = (value) => String(value || '').replace(/\D/g, '');

export const capitalize = (text) => text ? `${text.charAt(0).toUpperCase()}${text.slice(1)}` : '';

export const formatDateTime = (ms) => ms ? new Date(ms).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '';

export const formatTime = (ms) => ms ? new Date(ms).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';

/* 1500.5 -> "1.500,50"; 100 -> "100" */
export const formatMoney = (value) => typeof value === 'number' && isFinite(value)
	? value.toLocaleString('pt-BR', { minimumFractionDigits: Number.isInteger(value) ? 0 : 2, maximumFractionDigits: 2 })
	: '';

/* "1.500,50" -> 1500.5 (ponto e separador de milhar, virgula de centavos); vazio -> null */
export const parseMoney = (text) => {
	const clean = String(text || '').replace(/[^\d,]/g, '');
	if (!clean) return null;

	const value = Number(clean.replace(',', '.'));
	return isFinite(value) ? Math.round(value * 100) / 100 : null;
};

export const PROFILES = [
	{ value: 'crianca', label: 'Criança', icon: 'balloon-fill' },
	{ value: 'mulher', label: 'Mulher', icon: 'person-standing-dress' },
	{ value: 'homem', label: 'Homem', icon: 'person-standing' },
];

export const profileLabel = (value) => (PROFILES.find((p) => p.value === value) || {}).label || '';

export const initials = (name) => String(name || '').trim().split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
