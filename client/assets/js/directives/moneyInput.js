if (!appSecretSanta)
	appSecretSanta = angular.module("secretSanta", []);

/*
 * Campo de valor em reais: aceita "80", "80,50" ou "1.500" e guarda um numero no modelo.
 * Ao sair do campo, o valor e reescrito no formato brasileiro.
 * Uso: <input type="text" ss-money ng-model="valor">
 */
appSecretSanta.directive('ssMoney', () => ({
	restrict: 'A',
	require: 'ngModel',
	link: (scope, element, attrs, ngModel) => {
		const format = (value) => typeof value === 'number' && isFinite(value)
			? value.toLocaleString('pt-BR', { minimumFractionDigits: Number.isInteger(value) ? 0 : 2, maximumFractionDigits: 2 })
			: '';

		// "1.500,50" -> 1500.5 (o ponto e separador de milhar e a virgula, de centavos)
		const parse = (text) => {
			const clean = String(text || '').replace(/[^\d,]/g, '');
			if (!clean) return null;

			const value = Number(clean.replace(',', '.'));
			return isFinite(value) ? Math.round(value * 100) / 100 : undefined;
		};

		ngModel.$parsers.push(parse);
		ngModel.$formatters.push(format);

		// Deixa digitar apenas numeros, ponto e virgula
		element.on('input', () => {
			const allowed = element.val().replace(/[^\d.,]/g, '');
			if (allowed !== element.val()) {
				element.val(allowed);
				ngModel.$setViewValue(allowed);
			}
		});

		element.on('blur', () => {
			const formatted = format(ngModel.$modelValue);
			if (formatted !== element.val()) {
				scope.$applyAsync(() => {
					ngModel.$setViewValue(formatted);
					ngModel.$render();
				});
			}
		});
	}
}));
