// #######################################################
// Botao "Sair" na navbar quando o acesso por senha esta ativo
// #######################################################

(function () {
    document.addEventListener('DOMContentLoaded', () => {
        fetch('/auth/status', { credentials: 'same-origin', headers: { 'Accept': 'application/json' } })
            .then(r => r.json())
            .then(status => {
                if (!status.enabled || !status.authenticated) return;

                const container = document.querySelector('.navbar-santa .container');
                if (!container || document.getElementById('logout-button')) return;

                const button = document.createElement('button');
                button.type = 'button';
                button.id = 'logout-button';
                button.className = 'btn btn-theme-toggle ms-2';
                button.title = 'Sair';
                button.setAttribute('aria-label', 'Sair');
                button.innerHTML = '<i class="bi bi-box-arrow-right"></i>';

                button.addEventListener('click', () => {
                    fetch('/auth/logout', { method: 'POST', credentials: 'same-origin' })
                        .finally(() => window.location.replace('/login.html'));
                });

                const themeToggle = document.getElementById('theme-toggle');
                if (themeToggle) themeToggle.insertAdjacentElement('afterend', button);
                else container.appendChild(button);
            })
            .catch(() => {});
    });
})();
