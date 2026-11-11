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

    const next = new URLSearchParams(window.location.search).get('next') || '/';

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

            window.location.replace(data.redirect || '/');
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
            if (!status.enabled || status.authenticated) window.location.replace(next.startsWith('/') && !next.startsWith('//') ? next : '/');
        })
        .catch(() => {});
})();
