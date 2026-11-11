// #######################################################
// Alternancia entre tema claro (padrao) e escuro
// Script classico no <head>: aplica o tema antes da pagina ser exibida
// #######################################################

(function () {
    const STORAGE_KEY = 'secretsanta-theme';
    const root = document.documentElement;

    const getStoredTheme = () => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored === 'dark' || stored === 'light') return stored;
        } catch (e) { /* sem localStorage */ }
        return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
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

        button.innerHTML = `<i class="bi ${isDark ? 'bi-sun-fill' : 'bi-moon-stars-fill'}" aria-hidden="true"></i>`;
        button.setAttribute('aria-label', label);
        button.setAttribute('title', label);
        button.setAttribute('aria-pressed', String(isDark));
    };

    const applyTheme = (theme) => {
        root.setAttribute('data-theme', theme);
        updateButton(theme);
    };

    const toggleTheme = () => {
        const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        storeTheme(next);
        applyTheme(next);
    };

    applyTheme(getStoredTheme());

    document.addEventListener('DOMContentLoaded', () => {
        const nav = document.querySelector('.topbar-nav');
        if (!nav || document.getElementById('theme-toggle')) return;

        const button = document.createElement('button');
        button.type = 'button';
        button.id = 'theme-toggle';
        button.className = 'icon-btn';
        button.addEventListener('click', toggleTheme);

        nav.appendChild(button);
        updateButton(root.getAttribute('data-theme'));
    });

    // Mantem as abas abertas sincronizadas
    window.addEventListener('storage', (event) => {
        if (event.key === STORAGE_KEY) applyTheme(getStoredTheme());
    });
})();
