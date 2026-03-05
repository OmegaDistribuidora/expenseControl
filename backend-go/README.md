# backend-go (migracao incremental)

Este servico e o inicio da troca do backend Java para Go, mantendo o mesmo contrato de API do frontend.

## Status atual

Implementado:

- `GET /healthz`
- `GET /auth/me` (Basic Auth + PostgreSQL)
- `GET /categorias` (perfil `FILIAL`)
- `GET /admin/categorias` (perfil `ADMIN`)
- `GET /solicitacoes`
- `GET /solicitacoes/{id}`
- `POST /solicitacoes`
- `PUT /solicitacoes/{id}/reenvio`
- `GET /admin/solicitacoes`
- `GET /admin/solicitacoes/estatisticas`
- `PATCH /admin/solicitacoes/{id}/pedido-info`
- `PATCH /admin/solicitacoes/{id}/decisao`
- `DELETE /admin/solicitacoes/{id}`
- `GET /admin/contas`
- `GET /admin/contas/filiais`
- `POST /admin/contas`
- `PUT /admin/contas/{usuario}/senha`
- `GET /admin/auditoria`
- `GET /solicitacoes/{id}/anexos`
- `GET /requests/{id}/attachments`
- `POST /solicitacoes/{id}/anexos`
- `GET /anexos/{id}/download`
- `DELETE /anexos/{id}`
- aliases `/attachments/*`
- CORS por `CORS_ALLOWED_ORIGINS`
- Conexao de banco por `DATABASE_URL` ou `PGHOST/PGPORT/PGDATABASE/PGUSER/PGPASSWORD`
- Formato de erro JSON compativel com o frontend (`message`, `details`, etc.)

Pendente para paridade completa:

- Sem pendencias funcionais para o frontend atual.

## Como rodar local

1. Instale Go 1.22+.
2. Entre na pasta `backend-go`.
3. Configure variaveis de ambiente:
   - `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, `PGPASSWORD`
   - opcional: `CORS_ALLOWED_ORIGINS`, `PORT`
   - opcional: `SEED_DEFAULT_USERS=true|false` (default `true`)
4. Rode:

```bash
go mod tidy
go run ./cmd/server
```

## Deploy (Railway)

No servico novo de backend Go, configure:

- `DATABASE_URL` (do Postgres Railway)
- `CORS_ALLOWED_ORIGINS` com dominio do frontend
- `PORT` (Railway injeta automaticamente)

## Observacao importante

Enquanto os endpoints pendentes nao forem migrados, este backend Go ainda nao substitui o backend Java em producao.
