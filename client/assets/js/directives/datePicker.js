if (!appSecretSanta)
	appSecretSanta = angular.module("secretSanta", []);

/*
 * Seletor de data/horario em portugues (flatpickr), independente do idioma do navegador.
 * Uso: <input ss-date-picker ss-model="data"> ou <input ss-date-picker="time" ss-model="hora">
 * O modelo e sempre um Date (ou null). Nao usa ng-model para o Angular nao tratar o campo como texto.
 */
appSecretSanta.directive('ssDatePicker', ($parse) => ({
	restrict: 'A',
	link: (scope, element, attrs) => {
		const model = $parse(attrs.ssModel);
		const timeOnly = attrs.ssDatePicker === 'time';

		const options = timeOnly
			? { enableTime: true, noCalendar: true, time_24hr: true, dateFormat: 'H:i', minuteIncrement: 15 }
			: { dateFormat: 'd/m/Y', minDate: 'today' };

		const picker = flatpickr(element[0], {
			...options,
			locale: 'pt',
			allowInput: true,
			// Usa o calendario em portugues tambem no celular (o nativo segue o idioma do aparelho)
			disableMobile: true,
			onChange: (dates) => scope.$applyAsync(() => model.assign(scope, dates[0] || null)),
		});

		// Mudancas feitas pelo controller (atalhos, limpar formulario, modo de teste)
		scope.$watch(attrs.ssModel, (value) => {
			const current = picker.selectedDates[0];
			if (value instanceof Date ? (!current || current.getTime() !== value.getTime()) : current) {
				picker.setDate(value instanceof Date ? value : null, false);
			}
		});

		scope.$on('$destroy', () => picker.destroy());
	}
}));
