if (!appSecretSanta)
	appSecretSanta = angular.module("secretSanta", []);

// Status do ultimo e-mail enviado ao participante
const EMAIL_STATUS = {
	sending:    { label: 'Enviando...',       icon: 'bi-hourglass-split',  css: 'text-bg-secondary' },
	sent:       { label: 'Enviado',           icon: 'bi-send-check',       css: 'text-bg-info' },
	delayed:    { label: 'Entrega atrasada',  icon: 'bi-clock-history',    css: 'text-bg-warning' },
	delivered:  { label: 'Entregue',          icon: 'bi-check2-circle',    css: 'text-bg-success' },
	opened:     { label: 'Aberto',            icon: 'bi-envelope-open',    css: 'text-bg-success' },
	clicked:    { label: 'Link acessado',     icon: 'bi-hand-index-thumb', css: 'text-bg-success' },
	bounced:    { label: 'Devolvido',         icon: 'bi-x-octagon-fill',   css: 'text-bg-danger' },
	failed:     { label: 'Falha no envio',    icon: 'bi-x-octagon-fill',   css: 'text-bg-danger' },
	complained: { label: 'Marcado como spam', icon: 'bi-flag-fill',        css: 'text-bg-danger' },
	suppressed: { label: 'Endereço bloqueado', icon: 'bi-slash-circle',    css: 'text-bg-danger' },
};

const DELIVERED = ['delivered', 'opened', 'clicked'];
const PROBLEMS = ['bounced', 'failed', 'complained', 'suppressed'];
const PENDING = ['sending', 'sent', 'delayed'];
const REFRESH_MS = 10000;

appSecretSanta.controller('ctrlPanel', ($scope, $interval, panelService) => {
	const eventId = getUrlParameter('event');
	const token = getUrlParameter('token');

	$scope.data = null;
	$scope.loading = false;
	$scope.busy = false;
	$scope.accessError = '';
	$scope.summary = { total: 0, delivered: 0, problems: 0, wishlists: 0 };
	$scope.edit = {};
	$scope.modal = {};
	$scope.now = Date.now();

	const modalOf = (id) => bootstrap.Modal.getOrCreateInstance(document.getElementById(id));

	const showMessage = (options) => {
		$scope.modal = { type: 'error', icon: 'bi-exclamation-triangle-fill', button: 'Entendi', ...options };
		modalOf('messageModal').show();
	};

	const errorMessage = (err, fallback) =>
		(err && err.data && err.data.message) || fallback || 'Não foi possível falar com o servidor. Tente novamente.';

	const applyData = (data) => {
		const participants = data.participants || [];

		$scope.data = data;
		$scope.now = Date.now();
		$scope.summary = {
			total: participants.length,
			delivered: participants.filter(p => p.emailStatus && DELIVERED.includes(p.emailStatus.status)).length,
			problems: participants.filter(p => p.emailStatus && PROBLEMS.includes(p.emailStatus.status)).length,
			wishlists: participants.filter(p => p.wishlistItems > 0).length,
		};
	};

	const hasPending = () => $scope.data && $scope.data.participants.some(p => p.emailStatus && PENDING.includes(p.emailStatus.status));

	$scope.load = () => {
		if (!eventId || !token) {
			$scope.accessError = 'O link está incompleto. Use o link "Abrir painel do organizador" do e-mail que você recebeu.';
			return;
		}

		$scope.loading = true;

		panelService.get(eventId, token)
			.then((response) => applyData(response.data))
			.catch((err) => {
				if (err.status === 403 || err.status === 404) {
					$scope.data = null;
					$scope.accessError = 'Este link não é válido. Confira se copiou o link completo do e-mail do organizador.';
				}
			})
			.finally(() => { $scope.loading = false; });
	};

	// Atualiza automaticamente enquanto houver e-mails a caminho
	const timer = $interval(() => {
		$scope.now = Date.now();
		if (hasPending() && !$scope.loading && !$scope.busy) $scope.load();
	}, REFRESH_MS);

	$scope.$on('$destroy', () => $interval.cancel(timer));

	$scope.status = (p) => {
		if (p.emailStatus) return EMAIL_STATUS[p.emailStatus.status] || EMAIL_STATUS.sent;

		if (!$scope.data.event.drawn && !p.isHost)
			return { label: 'Aguardando sorteio', icon: 'bi-hourglass', css: 'bg-body-tertiary text-body-secondary border' };

		return { label: 'Não enviado', icon: 'bi-dash-circle', css: 'bg-body-tertiary text-body-secondary border' };
	};

	$scope.kindLabel = (kind) => kind === 'organizer' ? 'Link do painel' : 'Resultado do sorteio';

	$scope.formatDate = (ms) => ms ? new Date(ms).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '';
	$scope.formatTime = (ms) => ms ? new Date(ms).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';

	$scope.confirmDraw = () => modalOf('drawModal').show();

	$scope.draw = () => {
		$scope.busy = true;

		panelService.draw(eventId, token)
			.then((response) => {
				applyData(response.data);
				modalOf('drawModal').hide();
				showMessage({
					type: 'success',
					icon: 'bi-check-lg',
					title: 'Sorteio realizado! 🎉',
					message: 'Os e-mails estão sendo enviados agora. Acompanhe a entrega de cada um aqui no painel.',
					button: 'Ótimo!'
				});
			})
			.catch((err) => {
				modalOf('drawModal').hide();
				showMessage({ title: 'Não foi possível sortear', message: errorMessage(err) });
				$scope.load();
			})
			.finally(() => { $scope.busy = false; });
	};

	$scope.resend = (p) => {
		$scope.busy = true;

		panelService.resend(eventId, token, p.id)
			.then((response) => {
				applyData(response.data);
				showMessage({
					type: 'success',
					icon: 'bi-send-check',
					title: 'E-mail reenviado',
					message: `Um novo e-mail foi enviado para ${p.name} (${p.email}).`,
					button: 'Ok'
				});
			})
			.catch((err) => showMessage({ title: 'Não foi possível reenviar', message: errorMessage(err) }))
			.finally(() => { $scope.busy = false; });
	};

	$scope.openEdit = (p) => {
		$scope.edit = { id: p.id, name: p.name, email: p.email, celphone: p.celphone, canResend: p.canResend };
		modalOf('editModal').show();
	};

	$scope.saveEdit = () => {
		const { id, name, email, celphone } = $scope.edit;

		if (!name || !email) {
			showMessage({ title: 'Quase lá!', message: 'Informe o nome e um e-mail válido.' });
			return;
		}

		$scope.busy = true;

		panelService.updateParticipant(eventId, token, id, { name, email, celphone: celphone || '' })
			.then((response) => {
				applyData(response.data);
				modalOf('editModal').hide();
			})
			.catch((err) => {
				modalOf('editModal').hide();
				showMessage({ title: 'Não foi possível salvar', message: errorMessage(err) });
			})
			.finally(() => { $scope.busy = false; });
	};
});
