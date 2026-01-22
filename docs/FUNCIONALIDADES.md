# Funcionalidades do Sistema

## Visao geral
- Sistema de controle de solicitacoes de despesas entre filiais e administracao.
- Perfis principais: ADMIN e FILIAL.
- Fluxo basico: filial cria solicitacao -> admin analisa -> aprova/reprova ou pede ajuste -> filial reenvia.

## Perfis e permissoes
- FILIAL
  - Criar solicitacao com itens e anexos.
  - Reenviar solicitacao quando o status estiver em PENDENTE_INFO.
  - Visualizar detalhes, anexos e historico das proprias solicitacoes.
  - Buscar e ordenar solicitacoes recentes.
- ADMIN
  - Visualizar todas as solicitacoes.
  - Filtrar por status (PENDENTE, PENDENTE_INFO, APROVADO, REPROVADO) e ordenar.
  - Aprovar, reprovar ou pedir ajuste de uma solicitacao pendente.
  - Excluir solicitacao (remove itens, anexos e historico).
  - Gerenciar categorias (criar e inativar).
  - Visualizar anexos e historico.

## Fluxo de solicitacao
1. FILIAL cria solicitacao -> status inicia em PENDENTE.
2. ADMIN pode pedir ajuste -> status vira PENDENTE_INFO e registra comentario.
3. FILIAL reenvia -> status volta para PENDENTE, atualiza dados e registra comentario.
4. ADMIN decide -> status vira APROVADO ou REPROVADO.
5. ADMIN pode excluir a solicitacao a qualquer momento (acao destrutiva).

## Campos da solicitacao
- Categoria (obrigatorio, precisa estar ativa).
- Titulo (obrigatorio).
- Nome do solicitante (obrigatorio).
- Descricao/justificativa (obrigatorio).
- Onde vai ser usado (obrigatorio).
- Valor estimado (obrigatorio, > 0).
- Fornecedor (opcional).
- Forma de pagamento (opcional).
- Observacoes (opcional).
- Itens da solicitacao (lista):
  - Nome do item (obrigatorio se o item for preenchido).
  - Valor do item (obrigatorio se o item for preenchido, > 0).
  - Observacao do item (opcional).

## Validacoes principais (front + back)
- Titulo: max 120.
- Nome do solicitante: max 120.
- Descricao: max 2000.
- Onde vai ser usado: max 255.
- Fornecedor: max 120.
- Forma de pagamento: max 50.
- Observacoes: max 1000.
- Itens: descricao max 160, observacao max 300.
- Comentario de reenvio: max 500.
- Comentario de decisao: max 500.
- Comentario de pedido de ajuste: max 500 (obrigatorio no pedido).
- Categoria: nome max 120, descricao max 255.
- Valor estimado e valor aprovado: > 0 quando informados.

## Categorias
- ADMIN cria categorias e pode inativar.
- Categoria inativa nao pode ser usada em novas solicitacoes ou reenvios.

## Anexos
- Tipos permitidos: PDF, JPG, PNG.
- Maximo 5 arquivos por solicitacao.
- Tamanho maximo por arquivo: 10MB.
- Upload e exclusao somente quando a solicitacao esta em PENDENTE.
- Arquivos sao armazenados no Google Drive, com nome padronizado e metadados no banco.

## Listagem, busca e ordenacao
- FILIAL: busca local por titulo, categoria ou fornecedor (pagina carregada).
- ADMIN: busca local por titulo, filial ou categoria (pagina carregada).
- Ordenacao por data, valor e titulo.
- Listas retornam por pagina (paginacao com page/size, padrao 20 e max 50) para evitar carga excessiva.
- Aba "Aprovadas" mostra apenas solicitacoes aprovadas.
- Modo compacto ativo por padrao no painel admin.

## Historico
- Registro automatico de acoes: CRIADA, PEDIDO_INFO, REENVIADA, APROVADA, REPROVADA.
- Exibido nas telas de detalhes.

## Seguranca e controle de acesso
- Apenas ADMIN acessa recursos administrativos.
- FILIAL so acessa solicitacoes da propria filial.
- Acoes destrutivas usam confirmacao (exclusao de solicitacao e inativacao de categoria).
