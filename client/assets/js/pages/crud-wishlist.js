// #######################################################
// Edicao da propria lista de presentes (crudWishlist.html?idparticipant=...&token=...)
// O token de edicao chega apenas no link enviado ao proprio participante.
// #######################################################

import { $, $$, h, icon, mount, param } from '../lib/dom.js';
import { wishlists, errorText } from '../lib/api.js';
import { showMessage, setBusy, toast, initLogout } from '../lib/ui.js';
import { loadSuggestions } from '../lib/suggestions.js';

initLogout();

const idParticipant = param('idparticipant');
const editToken = param('token') || '';
const canEdit = Boolean(idParticipant && editToken);

let saved = [];
let items = [];
let dirty = false;
let uid = 0;

const list = $('#items');
const saveButton = $('#save');

const withUid = (item) => ({ uid: ++uid, product: '', price: '', infoExtra: '', ...item });

const setDirty = (value) => {
	dirty = value;
	$('#savebar').hidden = !dirty;
	$('#count').textContent = items.length ? `${items.length} ${items.length === 1 ? 'item' : 'itens'}` : '';
};

const input = (item, key, props) => h('input', {
	class: 'input',
	value: item[key] == null ? '' : String(item[key]),
	disabled: !canEdit,
	onInput: (e) => { item[key] = e.target.value; setDirty(true); },
	...props,
});

function render() {
	if (!items.length) {
		mount(list, h('li', { class: 'empty' }, icon('inbox'),
			canEdit ? 'Nenhum item ainda. Adicione um presente ou escolha uma das ideias abaixo!' : 'Nenhum item na lista.'));
		return;
	}

	mount(list, items.map((item, i) => h('li', { class: 'gift gift-edit' },
		h('span', { class: 'gift-num' }, String(i + 1)),
		h('div', { class: 'gift-edit-fields' },
			input(item, 'product', { type: 'text', placeholder: 'Nome do presente', maxLength: 200, 'aria-label': `Presente ${i + 1}` }),
			h('div', { class: 'affix' },
				h('span', { class: 'affix-icon' }, 'R$'),
				input(item, 'price', { type: 'text', placeholder: '0,00', inputMode: 'decimal', maxLength: 30, 'aria-label': `Preço estimado do presente ${i + 1}` })),
			h('div', { class: 'full' },
				input(item, 'infoExtra', { type: 'text', placeholder: 'Cor, tamanho, modelo, link...', maxLength: 500, 'aria-label': `Detalhes do presente ${i + 1}` }))),
		canEdit && h('button', {
			type: 'button', class: 'btn btn-sm btn-icon btn-danger-ghost', title: 'Remover item', 'aria-label': `Remover presente ${i + 1}`,
			onClick: () => { items.splice(i, 1); render(); setDirty(true); },
		}, icon('trash3')))));
}

const focusLast = () => {
	const fields = $$('.gift:last-child .input', list);
	if (fields[0]) { fields[0].focus(); fields[0].scrollIntoView({ behavior: 'smooth', block: 'center' }); }
};

async function load() {
	if (!idParticipant) {
		saved = [];
	} else {
		try {
			const data = await wishlists.get(idParticipant);
			saved = (data && data.wishlist) || [];
		} catch (err) {
			if (err.status !== 404) console.log(err);
			saved = [];
		}
	}

	items = saved.map(({ product, price, infoExtra }) => withUid({ product, price, infoExtra }));
	render();
	setDirty(false);
}

$('#add-item').addEventListener('click', () => {
	items.push(withUid());
	render();
	setDirty(true);
	focusLast();
});

$('#discard').addEventListener('click', () => {
	items = saved.map(({ product, price, infoExtra }) => withUid({ product, price, infoExtra }));
	render();
	setDirty(false);
});

saveButton.addEventListener('click', async () => {
	if (!canEdit) {
		showMessage({ type: 'error', title: 'Link inválido', message: 'Link de edição inválido. Use o link "Adicionar presentes" recebido por e-mail.' });
		return;
	}

	// Itens totalmente vazios sao descartados; o nome do presente e obrigatorio
	const payload = items
		.map(({ product, price, infoExtra }) => ({ product: String(product || '').trim(), price: String(price || '').trim(), infoExtra: String(infoExtra || '').trim() }))
		.filter((i) => i.product || i.price || i.infoExtra);

	const missing = payload.findIndex((i) => !i.product);
	if (missing >= 0) {
		showMessage({ type: 'error', title: 'Quase lá!', message: `Informe o nome do presente ${missing + 1}.` });
		return;
	}

	setBusy(saveButton, true, 'Salvando...');
	try {
		await wishlists.save(idParticipant, editToken, payload);
		await load();
		toast('Lista salva! Seu amigo secreto já pode ver.');
	} catch (err) {
		console.log(err);
		showMessage({ type: 'error', title: 'Falha ao salvar a lista', message: errorText(err, 'Erro desconhecido') });
	} finally {
		setBusy(saveButton, false);
	}
});

// Avisa antes de sair com alteracoes nao salvas
window.addEventListener('beforeunload', (e) => {
	if (dirty) { e.preventDefault(); e.returnValue = ''; }
});

if (!canEdit) {
	$('#no-edit').hidden = false;
	$('#add-item').hidden = true;
}

await load();

// Ideias: ja preenche o valor sugerido ("a partir de") e as lojas onde o presente pode ser encontrado
loadSuggestions(idParticipant, {
	onAdd: canEdit ? (s) => {
		const price = s.from ? Number(s.from).toFixed(2).replace('.', ',') : '';
		const stores = (s.links || []).map((l) => l.store).join(', ');
		items.push(withUid({ product: s.title, price, infoExtra: stores ? `Lojas: ${stores}` : '' }));
		render();
		setDirty(true);
		toast(`${s.title} adicionado — não esqueça de salvar`, 'plus-circle-fill');
	} : null,
	lead: ({ maxAmount }) => canEdit
		? ['Sugestões', maxAmount ? ` de até R$ ${maxAmount}` : '', '. Clique em ', h('strong', {}, 'Adicionar'), ' e depois em ', h('strong', {}, 'Salvar lista'), '.']
		: ['Sugestões', maxAmount ? ` de até R$ ${maxAmount}` : '', '.'],
});
