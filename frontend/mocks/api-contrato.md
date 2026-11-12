# Contrato de API — Porteiro Digital (S7)

Documento de alinhamento entre o **frontend** (Ravi) e o **backend** (Lucas).
Segue o *Documento de Requisitos v1.0 (03/11/2026)*.

> **Status:** proposta do frontend, aguardando aprovação do Lucas (critério de conclusão da S7).
> Aprovação: ______________________ Data: ___/___/______

## Como o frontend usa este contrato

- As telas chamam só as funções de [`frontend/js/api.js`](../js/api.js).
- Hoje `API_CONFIG.MODO = 'mock'`: o backend é simulado no navegador. Os dados iniciais vêm de `fetch()` nos JSON desta pasta e o estado do dia fica no `localStorage`, compartilhado entre a tela da porta e o painel.
- Quando a API estiver pronta: `MODO = 'real'` e `BASE_URL = 'http://servidor/api'`. Nenhuma tela muda.

## Convenções

- JSON em UTF-8. Datas e horas em ISO 8601 (`2026-11-12T09:15:00-03:00`).
- Erros: status HTTP 4xx/5xx com corpo `{ "erro": "codigo", "mensagem": "texto para exibir" }`.
- O frontend **nunca** recebe hash de PIN, lista de bloqueados ou dados de outros laboratórios (RNF02).
- **Sem CPF:** o RF10 pede só nome, motivo e, opcionalmente, com quem falar, e a LGPD exige coleta mínima (R1, RNF03).

## Status de um pedido (RF28)

| status | Significado |
|---|---|
| `pendente` | Enviado aos responsáveis, aguardando decisão |
| `sem_identificacao` | A pessoa tocou em "Chamar atendente" (RF31). Vai só para o painel do operador |
| `autorizado` | Um responsável autorizou (RF11) |
| `negado` | Um responsável negou |
| `expirado` | Ninguém respondeu em T2 (RF27) |
| `encerrado` | O operador encerrou um pedido sem identificação, com motivo (RN14) |
| `registrado` | Laboratório no modo "apenas registro" (RF05): a visita só é registrada |

---

## 1. Laboratório

`GET /laboratorio` → dados públicos do laboratório da tela.

```json
{
  "id": "labmaker", "nome": "LabMaker",
  "modo": "controle",
  "abertura": "assistida",
  "T1_min": 3, "T2_min": 10,
  "prazo_retencao_foto": "a definir (parâmetro P)",
  "motivos": ["Conhecer o laboratório", "Falar com um professor", "Reunião agendada"],
  "responsaveis": [
    { "id": "resp-helena", "nome": "Profa. Helena Duarte", "telefone": "(27) 9 0000-0001" }
  ]
}
```
- `modo`: `controle` ou `registro` (RF05). `abertura`: `assistida` ou `automatica` (D1).
- `responsaveis` vem na **ordem de acionamento** (RF13).

## 2. Pedidos de visitantes

### Listar pedidos do dia (fila do operador)
`GET /pedidos?data=hoje` → array de pedidos (formato abaixo). Exemplo: [`fila.json`](fila.json).

### Obter um pedido (a tela da porta acompanha o status, RF25)
`GET /pedidos/{id}` → um pedido.

```json
{
  "id": "P-101",
  "tipo": "visitante",
  "nome": "Juliana Ferreira",
  "motivo": "Conhecer o laboratório",
  "falar_com": "resp-helena",
  "foto": "data:image/jpeg;base64,...",
  "sem_foto": false,
  "criado_em": "2026-11-12T14:02:00-03:00",
  "status": "pendente",
  "notificados": [
    { "responsavel": "resp-helena", "em": "2026-11-12T14:02:00-03:00" }
  ],
  "decisao": null,
  "encerramento": null,
  "contato": null
}
```
- `notificados`: quem já recebeu o pedido e quando (escalonamento do RF27). Com mais de um item, a tela mostra "Seu pedido foi encaminhado a outra pessoa".
- `decisao`: `{ "por": "resp-helena", "acao": "autorizar" | "negar" | "negar_agendar", "validade": "esta_entrada" | "dia" | null, "em": "..." }` (RF12).
- `encerramento`: `{ "por": "Anderson Lima", "motivo": "...", "em": "..." }`.
- `contato`: `{ "valor": "email ou telefone", "em": "..." }` (RF26).
- `foto`: nesta fase vai em base64. **Sugestão ao Lucas:** no real, devolver uma URL interna protegida por perfil (RNF02) em vez do base64 na listagem.

### Criar pedido (RF10, RF16)
`POST /pedidos`
```json
{ "nome": "Juliana Ferreira", "motivo": "Conhecer o laboratório", "falar_com": "resp-helena", "foto": "data:image/jpeg;base64,..." }
```
- `falar_com` e `foto` podem ser `null` (`foto` nula só se a câmera falhar; quem recusa a foto vai para "Chamar atendente").
- `201` → pedido criado (`pendente`, ou `registrado` no modo apenas registro).
- `403 { "erro": "bloqueado" }` → pessoa bloqueada; nenhum pedido é enviado (RN06).
- `400 { "erro": "dados_incompletos" }`.

### Chamar atendente (RF31)
`POST /pedidos/sem-identificacao` (sem corpo) → pedido com `status: "sem_identificacao"`, sem nome e sem foto. Não é enviado aos responsáveis.

### Deixar contato (RF26)
`POST /pedidos/{id}/contato` → `{ "contato": "juliana@exemplo.com" }`
- Só para pedido `expirado` ou negado com `negar_agendar`. Senão `409 { "erro": "nao_permitido" }`.

### Encerrar pedido sem identificação (RN14)
`POST /pedidos/{id}/encerramento` → `{ "operador": "Anderson Lima", "motivo": "Entrega recebida pela portaria" }`
- `400 { "erro": "motivo_obrigatorio" }` se o motivo estiver vazio.
- `409 { "erro": "nao_permitido" }` se o pedido não for `sem_identificacao` (o operador não decide pedidos de visitantes).

### Decisão do responsável — feita pelo backend/canal de mensagens, não pelo frontend
A decisão chega pelo bot do canal de mensagens (D3). O frontend só **lê** o resultado em `GET /pedidos/{id}`.
O backend precisa garantir três regras:
- vale a primeira decisão (`409 ja_resolvido`);
- pedido expirado não pode ser autorizado (`409 expirado`);
- ao autorizar, a entrada do visitante entra no registro de acessos (RF03).

No mock existe `Api.simularDecisao()` apenas para os testes do frontend.

## 3. Acessos (usuários cadastrados)

### Identificar por credencial (RF01, RNF04 — D2 opção "matrícula + PIN")
`POST /acessos/credencial` → `{ "matricula": "20241BSI0012", "pin": "1234" }`

| Resposta | Quando |
|---|---|
| `200 { "tipo": "entrada", "nome": "Pedro Almeida", "acesso": {...} }` | Entrada registrada (RF03) |
| `200 { "tipo": "saida", "nome": "...", "acesso": {...} }` | A pessoa já estava dentro: registra a saída (proposta para o RF04) |
| `401 { "erro": "credencial_invalida", "restantes": 3 }` | Matrícula ou PIN errados |
| `423 { "erro": "bloqueio_temporario", "ate": "..." }` | N tentativas inválidas; a coordenação é avisada |
| `403 { "erro": "bloqueado" }` | Bloqueado pela coordenação (RN06) |
| `403 { "erro": "inativo" }` | Vínculo encerrado (RN07) |
| `403 { "erro": "nao_autorizado" }` | Não autorizado neste laboratório (RN12) |
| `403 { "erro": "uso_restrito", "ate": "..." }` | Equipamento perigoso em uso (RF07, RN09) |

O PIN viaja só nesta chamada (HTTPS na rede interna) e é comparado com o hash no servidor.

### Liberação manual (RF29, cenário 5)
`POST /acessos/liberacao-manual` → `{ "matricula": "20241BSI0012", "justificativa": "Falha de rede na tela...", "operador": "Anderson Lima" }`
- `400 justificativa_obrigatoria`; `403 nao_cadastrado` (pessoa sem cadastro segue o fluxo de visitante).
- O registro não pode ser editado (RNF11) e o responsável é avisado (RF19).

### Histórico do dia (RF21)
`GET /acessos?data=hoje` → exemplo em [`historico.json`](historico.json)
```json
{
  "id": "A-006",
  "pessoa": { "tipo": "usuario", "id": "20232BSI0045", "nome": "Ana Clara Souza", "perfil": "usuario" },
  "entrada": "2026-11-12T10:45:00-03:00",
  "saida": null,
  "origem": "liberacao_manual",
  "autorizado_por": "Anderson Lima",
  "justificativa": "Falha de rede na tela. Aluna identificada presencialmente."
}
```
`origem`: `credencial`, `visita_autorizada`, `liberacao_manual` ou `registro_visitante`. `saida: null` = ainda no laboratório.

## 4. Avisos e status da tela

- `GET /avisos?data=hoje` → `[{ "para": "resp-helena" | "atendente", "texto": "...", "pedido": "P-101", "em": "..." }]`. Mensagens enviadas pelo canal (RF19); o painel mostra para o operador acompanhar.
- `POST /telas/sinal` → a tela da porta avisa a cada 10 s que está viva.
- `GET /telas/status` → `{ "online": true, "ultimo_sinal": "..." }`. O painel mostra "Tela sem comunicação desde 15h02" (cenário 5, RNF12).

## Arquivos de exemplo (mocks)

| Arquivo | Conteúdo |
|---|---|
| `laboratorio.json` | Configuração do laboratório, responsáveis em ordem e motivos. No mock também guarda N, bloqueados e uso restrito, que no real ficam só no servidor |
| `usuarios.json` | Usuários cadastrados de teste, com hash SHA-256 do PIN (só o mock usa) |
| `fila.json` | Pedidos de exemplo do dia |
| `historico.json` | Acessos de exemplo do dia |

### Credenciais de teste

| Matrícula/SIAPE | PIN | Situação |
|---|---|---|
| 20241BSI0012 | 1234 | Pedro Almeida, bolsista ativo |
| 20232BSI0045 | 2468 | Ana Clara Souza, aluna ativa |
| 1845321 | 9090 | Marcos Vieira, servidor |
| L-0007 | 1111 | Rosa Lima, limpeza/manutenção (RN10) |
| 20201BSI0003 | 4321 | João Batista, vínculo encerrado (inativo) |
| 20242BSI0099 | 5555 | Bruno Teixeira, bloqueado |

Visitante bloqueado de teste: nome **"Visitante Bloqueado"**.
