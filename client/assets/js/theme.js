// #######################################################
// Alternancia entre tema claro (padrao) e escuro
// Carregado no <head> para aplicar o tema antes da pagina ser exibida
// #######################################################

(function () {
    const STORAGE_KEY = 'secretsanta-theme';
    const root = document.documentElement;

    const getStoredTheme = () => {
        try {
            return localStorage.getItem(STORAGE_KEY) === 'dark' ? 'dark' : 'light';
        } catch (e) {
            return 'light';
        }
    };

    const storeTheme = (theme) => {
        try {
            localStorage.setItem(STORAGE_KEY, theme);
        } catch (e) { /* sem localStorage: vale apenas para esta pagina */ }
    };

    const updateButton = (theme) => {
        const button = document.getElementById('theme-toggle');
        if (!button) return;

        const isDark = theme === 'dark';
        const label = isDark ? 'Usar tema claro' : 'Usar tema escuro';

        button.innerHTML = `<i class="bi ${isDark ? 'bi-sun-fill' : 'bi-moon-stars-fill'}"></i>`;
        button.setAttribute('aria-label', label);
        button.setAttribute('title', label);
        button.setAttribute('aria-pressed', String(isDark));
    };

    const applyTheme = (theme) => {
        root.setAttribute('data-bs-theme', theme);
        updateButton(theme);
    };

    const toggleTheme = () => {
        const next = root.getAttribute('data-bs-theme') === 'dark' ? 'light' : 'dark';
        storeTheme(next);
        applyTheme(next);
    };

    applyTheme(getStoredTheme());

    document.addEventListener('DOMContentLoaded', () => {
        const container = document.querySelector('.navbar-santa .container');
        if (!container || document.getElementById('theme-toggle')) return;

        const button = document.createElement('button');
        button.type = 'button';
        button.id = 'theme-toggle';
        button.className = 'btn btn-theme-toggle ms-auto';
        button.addEventListener('click', toggleTheme);

        container.appendChild(button);
        updateButton(root.getAttribute('data-bs-theme'));
    });

    // Mantem as abas abertas sincronizadas
    window.addEventListener('storage', (event) => {
        if (event.key === STORAGE_KEY) applyTheme(getStoredTheme());
    });
})();
