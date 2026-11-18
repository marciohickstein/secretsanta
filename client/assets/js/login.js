// #######################################################
// Pagina de acesso com senha
// #######################################################

(function () {
    const form = document.getElementById('login-form');
    const input = document.getElementById('password');
    const toggle = document.getElementById('toggle-password');
    const submit = document.getElementById('login-submit');
    const errorBox = document.getElementById('login-error');
    const submitLabel = submit.innerHTML;

    /*
     * Destino apos o login: apenas paginas deste site. Resolve a URL como o navegador
     * (que trata "\" como "/" e remove TAB/quebras de linha) e confere a origem.
     * Mesma regra do safeNext em src/middlewares/accessGate.js.
     */
    const safeNext = (value) => {
        if (typeof value !== 'string' || !value.startsWith('/')) return '/';
        try {
            const url = new URL(value, window.location.origin);
            const local = url.pathname + url.search + url.hash;
            // "/..//evil.com" normaliza para "//evil.com", que o navegador le como outro site
            return url.origin === window.location.origin && !local.startsWith('//') ? local : '/';
        } catch (e) {
            return '/';
        }
    };

    const next = safeNext(new URLSearchParams(window.location.search).get('next') || '/');

    const showError = (message) => {
        errorBox.querySelector('span').textContent = message;
        errorBox.hidden = false;
        input.setAttribute('aria-invalid', 'true');
    };

    const setLoading = (loading) => {
        submit.disabled = loading;
        submit.innerHTML = loading ? '<span class="spinner" aria-hidden="true"></span>Entrando...' : submitLabel;
    };

    toggle.addEventListener('click', () => {
        const visible = input.type === 'text';
        input.type = visible ? 'password' : 'text';
        toggle.innerHTML = `<i class="bi ${visible ? 'bi-eye' : 'bi-eye-slash'}" aria-hidden="true"></i>`;
        toggle.setAttribute('aria-label', visible ? 'Mostrar senha' : 'Ocultar senha');
        toggle.setAttribute('title', visible ? 'Mostrar senha' : 'Ocultar senha');
        input.focus();
    });

    input.addEventListener('input', () => {
        errorBox.hidden = true;
        input.removeAttribute('aria-invalid');
    });

    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        if (!input.value) {
            showError('Digite a senha.');
            return;
        }

        setLoading(true);

        try {
            const response = await fetch('/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({ password: input.value, next })
            });

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                showError(data.message || 'Não foi possível entrar. Tente novamente.');
                input.select();
                return;
            }

            window.location.replace(safeNext(data.redirect));
        } catch (e) {
            showError('Não foi possível falar com o servidor. Verifique sua conexão.');
        } finally {
            setLoading(false);
        }
    });

    // Se ja estiver logado (ou a senha estiver desativada), segue direto
    fetch('/auth/status', { credentials: 'same-origin', headers: { 'Accept': 'application/json' } })
        .then(r => r.json())
        .then(status => {
            if (!status.enabled || status.authenticated) window.location.replace(next);
        })
        .catch(() => {});
})();
