
let _TEST_ = getUrlParameter('test');

if (!appSecretSanta) {
	appSecretSanta = angular.module("secretSanta", []);
}

const idEvent = getUrlParameter('idevent');
appSecretSanta.value("idEvent", idEvent ? idEvent : '');

const startOfToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const defaultTime = () => new Date(1970, 0, 1, 20, 0);
const sameDay = (a, b) => a instanceof Date && b instanceof Date && a.toDateString() === b.toDateString();

// Proxima ocorrencia de um dia do ano (ex.: 24/12) a partir de hoje
const nextDayOfYear = (month, day) => {
	const today = startOfToday();
	const d = new Date(today.getFullYear(), month, day);
	if (d < today) d.setFullYear(d.getFullYear() + 1);
	return d;
};

// Proximo dia da semana (0 = domingo); se hoje for o dia, pula para a semana seguinte
const nextWeekday = (weekday) => {
	const d = startOfToday();
	d.setDate(d.getDate() + (((weekday - d.getDay() + 7) % 7) || 7));
	return d;
};

/* Junta a data e o horario escolhidos; null se algum estiver vazio ou invalido */
const combineDateTime = (date, time) => {
	if (!(date instanceof Date) || isNaN(date) || !(time instanceof Date) || isNaN(time)) return null;
	return new Date(date.getFullYear(), date.getMonth(), date.getDate(), time.getHours(), time.getMinutes());
};

// Ex.: "quinta-feira, 24/12/2026 às 20:00" (texto exibido nos e-mails e no painel)
const formatPartyDate = (d) =>
	`${d.toLocaleDateString('pt-BR', { weekday: 'long' })}, ${d.toLocaleDateString('pt-BR')} às ${pad(d.getHours())}:${pad(d.getMinutes())}`;

const UFS = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];

const onlyDigits = (value) => String(value || '').replace(/\D/g, '');

// Ex.: "Rua das Flores, 260 - Centro - Porto Alegre/RS" (o servidor monta o texto final, com o CEP)
const formatAddress = (a) => {
	const street = [a.street, a.number, a.complement].filter(Boolean).join(', ');
	const city = a.city && a.state ? `${a.city}/${a.state}` : a.city;
	return [street, a.district, city].filter(Boolean).join(' - ');
};

appSecretSanta.controller('ctrlEvent', ($scope, eventService, addressService, idEvent) => {
	$scope.events = [];
	$scope.idEvent = idEvent;

	$scope.eventTime = defaultTime();

	$scope.dateShortcuts = [
		{ label: 'Véspera de Natal', date: () => nextDayOfYear(11, 24) },
		{ label: 'Natal', date: () => nextDayOfYear(11, 25) },
		{ label: 'Próxima sexta', date: () => nextWeekday(5) },
		{ label: 'Próximo sábado', date: () => nextWeekday(6) },
	];

	// Valores mais comuns para o presente
	$scope.amountShortcuts = [50, 100, 150, 200];
	$scope.setAmount = (value) => { $scope.eventAmount = value; };

	$scope.setDate = (shortcut) => {
		$scope.eventDate = shortcut.date();
		if (!$scope.eventTime) $scope.eventTime = defaultTime();
	};

	$scope.isDateShortcut = (shortcut) => sameDay($scope.eventDate, shortcut.date());

	// Ex.: "Quinta-feira, 24 de dezembro de 2026 às 20:00"
	$scope.datePreview = () => {
		const d = combineDateTime($scope.eventDate, $scope.eventTime);
		if (!d) return '';

		const text = d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
		return `${text.charAt(0).toUpperCase()}${text.slice(1)} às ${pad(d.getHours())}:${pad(d.getMinutes())}`;
	};

	// ── Endereco da festa ──
	$scope.ufs = UFS;
	$scope.address = {};
	$scope.cepStatus = null;
	$scope.cepMessage = '';
	let lastCep = '';

	// Mascara 00000-000 e busca automatica ao completar os 8 digitos
	$scope.onCepChange = () => {
		const digits = onlyDigits($scope.address.cep).slice(0, 8);
		$scope.address.cep = digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;

		if (digits.length < 8) {
			lastCep = '';
			$scope.cepStatus = null;
			$scope.cepMessage = '';
			return;
		}

		if (digits === lastCep) return;
		lastCep = digits;

		$scope.cepStatus = 'loading';
		$scope.cepMessage = 'Buscando endereço...';

		addressService.lookupCep(digits)
			.then((response) => {
				if (lastCep !== digits) return; // o CEP mudou enquanto buscava

				const found = response.data;
				Object.assign($scope.address, {
					street: found.street || $scope.address.street,
					district: found.district || $scope.address.district,
					city: found.city,
					state: found.state,
				});

				$scope.cepStatus = 'found';
				$scope.cepMessage = found.street ? 'Endereço encontrado! Falta só o número.' : 'CEP geral da cidade: informe a rua e o número.';

				// Leva o cursor para o proximo campo que falta preencher
				const next = found.street ? 'party_number' : 'party_street';
				setTimeout(() => { const el = document.getElementById(next); if (el) el.focus(); });
			})
			.catch((err) => {
				if (lastCep !== digits) return;

				$scope.cepStatus = err.status === 404 || err.status === 400 ? 'notfound' : 'error';
				$scope.cepMessage = (err.data && err.data.message) || 'Não foi possível buscar o CEP. Preencha o endereço manualmente.';
			});
	};

	$scope.addressPreview = () => {
		const a = $scope.address;
		return a.street && a.number && a.city ? `${a.place ? `${a.place} — ` : ''}${formatAddress(a)}` : '';
	};

	$scope.addressMapUrl = () => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(formatAddress($scope.address))}`;

	$scope.daysLeft = () => {
		if (!($scope.eventDate instanceof Date)) return '';

		const days = Math.round(($scope.eventDate - startOfToday()) / 86400000);
		if (days < 0) return '';
		if (days === 0) return 'é hoje!';
		if (days === 1) return 'é amanhã!';
		return `faltam ${days} dias`;
	};

	if (_TEST_) {
		$scope.eventDate = nextDayOfYear(11, 24);
		$scope.address = { cep: '91340-110', place: 'Salão de Festas', street: 'Avenida Túlio de Rose', number: '260', district: 'Jardim Europa', city: 'Porto Alegre', state: 'RS' };
		$scope.eventAmount = 100;
		$scope.eventMessage = "Ola pessoal, nosso amigo secreto foi gerado pelo SecretSanta Generator. Por favor sigam as instrucoes e boas festas!";
		$scope.participants = [
			{
				name: "Marcio Hickstein",
				email: "marcio.hickstein@gmail.com",
				celphone: "51984120669",
				profile: "homem"
			},
			{
				name: "Ana Paula Fernandes",
				email: "marcio.inetsoft@gmail.com",
				celphone: "51984120669",
				profile: "mulher"
			},
			{
				name: "Leo Hickstein",
				email: "hicky.kt@gmail.com",
				celphone: "51984120669",
				profile: "crianca"
			}
		];
	}
	else {
		$scope.participants = [{}, {}, {}];
	}

	$scope.saving = false;
	$scope.modal = {};

	// Exibe a caixa de mensagem (sucesso ou erro) no lugar do alert()
	const showMessage = (options, onClose) => {
		const element = document.getElementById('messageModal');

		$scope.$applyAsync(() => {
			$scope.modal = {
				type: 'error',
				icon: 'bi-exclamation-triangle-fill',
				button: 'Entendi',
				...options
			};
		});

		if (onClose) {
			element.addEventListener('hidden.bs.modal', () => $scope.$apply(onClose), { once: true });
		}

		bootstrap.Modal.getOrCreateInstance(element).show();
	};

	const resetForm = () => {
		$scope.eventDate = null;
		$scope.eventTime = defaultTime();
		$scope.address = {};
		$scope.cepStatus = null;
		$scope.cepMessage = '';
		lastCep = '';
		$scope.eventAmount = null;
		$scope.eventMessage = '';
		$scope.participants = [{}, {}, {}];
	};

	$scope.validInput = function () {
		// Valida a data da festa
		const partyDate = combineDateTime($scope.eventDate, $scope.eventTime);

		if (!partyDate) {
			return "Escolha a data e o horário da festa. Dica: use os atalhos, como \"Véspera de Natal\".";
		}

		if (partyDate < new Date()) {
			return "A data da festa já passou. Escolha uma data e horário a partir de agora.";
		}

		// Valida campos do evento
		if (!($scope.eventAmount > 0)) {
			return "Informe o valor do presente, por exemplo R$ 100. Dica: use os atalhos abaixo do campo.";
		}

		// Valida o endereco da festa
		const a = $scope.address;

		if (onlyDigits(a.cep).length !== 8) {
			return "Informe o CEP do local da festa (8 números). Com ele preenchemos o endereço para você.";
		}

		if (!a.street || !a.number || !a.city || !a.state) {
			return "Complete o endereço da festa: rua, número, cidade e UF.";
		}

		if (!$scope.eventMessage) {
			return "Escreva uma mensagem para os convidados.";
		}

		// Valida participantes
		if (!$scope.participants || $scope.participants.length < 3) {
			return "O amigo secreto precisa de pelo menos 3 participantes, incluindo você.";
		}

		// Verifica se todos os participantes têm os dados obrigatórios
		for (const [index, p] of $scope.participants.entries()) {
			if (!p.name || !p.email || !p.celphone) {
				const who = index === 0 ? 'do organizador (participante 1)' : `do participante ${index + 1}`;
				return `Preencha nome, e-mail válido e celular ${who}.`;
			}

			// O perfil define as sugestoes de presente (crianca, mulher ou homem)
			if (!p.profile) {
				const who = index === 0 ? 'do organizador (participante 1)' : `do participante ${index + 1}`;
				return `Informe se ${who} é criança, mulher ou homem. Usamos isso para sugerir presentes.`;
			}
		}

		return "";
	};

	$scope.addParticipant = () => {
		$scope.participants.push({});
	}

	$scope.delParticipant = (participant) => {
		const idxToDel = $scope.participants.indexOf(participant);
		$scope.participants.splice(idxToDel, 1);
	}

	$scope.createEvent = async () => {
		if ($scope.saving)
			return;

		const errorMessage = $scope.validInput();

		if (errorMessage) {
			showMessage({ title: 'Quase lá!', message: errorMessage });
			return;
		}

		const restParticipants = $scope.participants.slice(1);
		const hostEmail = $scope.participants[0].email;

		const event = {
			date: formatPartyDate(combineDateTime($scope.eventDate, $scope.eventTime)),
			address: $scope.address,
			amount: $scope.eventAmount,
			host: $scope.participants[0],
			message: $scope.eventMessage,
			participants: restParticipants
		}

		$scope.saving = true;

		try {
			const response = await eventService.create(event);

			showMessage({
				type: 'success',
				icon: 'bi-check-lg',
				title: 'Evento criado com sucesso! 🎉',
				message: 'Agora é só fazer o sorteio pelo painel do organizador.',
				email: hostEmail,
				link: response.data && response.data.organizerUrl,
				button: 'Fechar'
			}, resetForm);
		} catch (err) {
			const serverMsg = err.data && err.data.message ? err.data.message : 'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.';
			console.error(`Erro ao criar evento [${err.status || '?'}]:`, err.data || err);

			showMessage({
				title: err.status === 429 ? 'Muitas tentativas' : 'Não foi possível criar o evento',
				message: serverMsg
			});
		} finally {
			$scope.$applyAsync(() => { $scope.saving = false; });
		}
	}

	$scope.getEvent = () => {
		if (!$scope.idEvent)
			return;

		eventService.get($scope.idEvent)
			.then((response) => {
				$scope.event = response.data;
			})
			.catch((error) => console.log(error));
	}
});

