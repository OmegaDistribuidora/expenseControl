# Paridade de API (Java -> Go)

## Ja migrado

- `GET /auth/me`
- `GET /categorias`
- `GET /admin/categorias`
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
- `POST /admin/categorias`
- `PATCH /admin/categorias/{id}/inativar`
- `GET /solicitacoes/{id}/anexos`
- `GET /requests/{id}/attachments`
- `POST /solicitacoes/{id}/anexos`
- `GET /anexos/{id}/download`
- `DELETE /anexos/{id}`
- aliases `/attachments/*`

## Pendente

- Nenhum endpoint pendente para o fluxo atual sem OAuth.
