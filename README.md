# amigosecreto


Amigo secreto em Node.js (Express + SQLite).

## Rodando com Docker

Crie o `.env` (veja as variáveis em `src/config/index.js`) e suba o container:

```bash
docker compose up -d --build   # build e start
docker compose logs -f         # logs
docker compose down            # parar
```

O banco (`data/`) e os logs (`logs/`) ficam no host, montados como volumes, então
sobrevivem à recriação do container. A porta 3333 é publicada só em `127.0.0.1`
(o nginx do host faz o proxy público).

O container roda com o uid/gid de `APP_UID`/`APP_GID` (padrão 1000), que deve ser o
dono de `data/` e `logs/` no host. No servidor os apps rodam como o usuário `app`,
então o `.env` de lá deve ter:

```bash
APP_UID=<saída de: id -u app>
APP_GID=<saída de: id -g app>
```

## Rodando sem Docker

```bash
nvm use        # Node 24
npm install
npm run dev
```

## Deploy

A cada push na `main`, o GitHub Actions roda os testes e, se passarem, acessa o
servidor via SSH, faz `git pull` e `docker compose up -d --build`.
