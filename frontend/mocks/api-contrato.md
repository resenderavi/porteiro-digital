# Contrato de API — Porteiro Digital (S7)

Documento de alinhamento entre o **frontend** (Ravi) e o **backend** (Lucas) para integrar a tela da recepção (tablet) e o painel do atendente. Segue o protótipo do Figma (S4).

> **Status:** proposta do frontend, aguardando aprovação do Lucas (critério de conclusão da S7).
> Aprovação: ______________________ Data: ___/___/______

## Como o frontend usa este contrato

- As telas chamam só as funções de [`frontend/js/api.js`](../js/api.js).
- Hoje `API_CONFIG.MODO = 'mock'`: os dados vêm dos JSON desta pasta via `fetch()` e o estado do dia fica no `localStorage`, para o tablet e o painel conversarem entre abas.
- Quando a API estiver pronta: `MODO = 'real'` e `BASE_URL = 'http://servidor/api'`. Nenhuma tela muda.

## Status de um visitante

| status | Quando |
|---|---|
| `aguardando` | Acabou de se cadastrar no tablet |
| `em_aprovacao` | O atendente abriu o cadastro |
| `autorizado` | O atendente aprovou |
| `recusado` | O atendente recusou |

---

## 1. Listar responsáveis
`GET /responsaveis` → lista para o visitante escolher quem vai visitar. Exemplo: [`responsaveis.json`](responsaveis.json)
```json
[ { "id": 1, "nome": "Prof. Ana Lima" } ]
```

## 2. Cadastrar visitante (tablet)
`POST /visitantes`
```json
{
  "nome": "Juliana Ferreira",
  "cpf": "529.982.247-25",
  "motivo": "Conhecer o laboratório",
  "responsavel": "Prof. Ana Lima",
  "hora_chegada": "10:40"
}
```
- `hora_chegada` é calculada pelo frontend (horário do tablet), como anotado no wireframe.
- O CPF já chega validado (dígitos verificadores) e formatado.
- Resposta `201`: o visitante criado, com `id` e `"status": "aguardando"`.

## 3. Listar fila (atendente)
`GET /fila` → visitantes do dia. Exemplo: [`fila.json`](fila.json)
```json
[
  {
    "id": 1,
    "nome": "Carlos Souza",
    "cpf": "123.456.789-00",
    "hora_chegada": "09:15",
    "status": "aguardando",
    "responsavel": "Prof. Ana Lima",
    "motivo": "Entrega de documentos"
  }
]
```
O painel mostra o CPF mascarado (`123.***.***-00`).

## 4. Mudar status (atendente)
`PATCH /visitantes/{id}/status`
```json
{ "status": "autorizado" }
```
- Valores aceitos: `em_aprovacao`, `autorizado`, `recusado`.
- Resposta `200`: o visitante atualizado. Ao virar `autorizado` ou `recusado`, o registro entra no histórico do dia.

## 5. Histórico do dia
`GET /historico` → tabela "Registros do dia". Exemplo: [`historico.json`](historico.json)
```json
[ { "nome": "Mariana Costa", "hora_entrada": "08:10", "status": "autorizado" } ]
```

## Erros
Qualquer status 4xx/5xx. O frontend mostra uma mensagem genérica ("Não foi possível enviar...").

## Dados para teste
- CPF válido para testar o formulário: `529.982.247-25`.
- Os CPFs da `fila.json` são fictícios e não passam na validação (só servem de exemplo na fila).
