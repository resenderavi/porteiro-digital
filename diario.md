# Diário de Bordo - Sprint 1 (S1)

## Ferramentas Instaladas e Repositório
- VS Code configurado com as extensões Live Server, Prettier e HTML CSS Support.
- Conta no Figma criada.
- Repositório criado com as pastas: `frontend/recepcao/`, `frontend/atendente/` e `prototipos/`.
- Link do repositório: https://github.com/resenderavi/porteiro-digital/edit/main/diario.md
- Obs: O arquivo HTML teste está na pasta frontend/recepcao.

## Desafios e Dúvidas
No momento de testar o modo Kiosk, o terminal do PowerShell não reconheceu o comando padrão. A solução foi adaptar o comando usando `Start-Process chrome -ArgumentList "--kiosk", "--app=..."`.

## Jornadas do Sistema e Alinhamento
Após a leitura da documentação e a reunião de kick-off com toda a equipe (Ravi, Maria Eduarda, Lucas e Pedro), alinhamos as dependências do projeto e listamos as 3 jornadas principais:
1. Visitante chegando à recepção.
2. Atendente recebendo a notificação.
3. Responsável aprovando a visita.

## Comprovação do Kiosk
![Teste do Kiosk funcionando](./image.png)

---

# Revisão das entregas S5, S6 e S7 — alinhamento com o Documento de Requisitos v1.0 (12/11/2026)

As telas da S5–S7 foram refeitas para seguir o Documento de Requisitos consolidado (03/11/2026). Onde o protótipo do Figma ou a sprint discordavam do documento, segui o documento.

## O que mudou

**Tela da recepção (`frontend/recepcao/index.html`, S5)**
- Tela inicial com as duas opções do cenário 1: **Tenho cadastro** e **Sou visitante**.
- Aviso de privacidade antes do formulário (RNF03, RN13).
- Wizard de 3 passos: (1) nome, motivo (lista + "Outro") e, opcionalmente, com quem falar; (2) foto com revisão e "tirar outra" (RF16); (3) **confirmação** antes de enviar.
- **Sem CPF** (RF10 + coleta mínima da LGPD).
- Tela de espera com status e tempo restante, atualizando sozinha (RF25), e aviso de repasse quando o responsável não responde (RF27).
- Resultados: autorizado (mostra quem autorizou), negado (não mostra quem negou), negado com sugestão de agendamento e expirado (oferece deixar contato, RF26).
- **Chamar atendente** para quem não quer se identificar ou recusa a foto (RF31, cenário 3B).
- Entrada de cadastrados com matrícula/SIAPE + PIN em teclado numérico na tela (D2, opção a), com bloqueio após N tentativas (RNF04). Se a pessoa já está dentro, registra a saída (proposta para o RF04).
- Volta ao início após 2 minutos sem toque (cenário 1, fluxo 1.a).
- Regras de kiosk da S5 mantidas: sem rolagem, cursor oculto (`?cursor=1` mostra o cursor para testar no PC), fonte base 20px, botões com 60px ou mais.

**Painel do atendente (`frontend/atendente/index.html`, S6)**
- **Sem Aprovar/Recusar para o atendente.** Pela RN14 quem decide é o responsável, pelo celular. A decisão aparece numa caixa separada, marcada como **simulação**, só para testar o fluxo.
- Fila com os status do RF28 (pendente, sem identificação, autorizado, negado, expirado, encerrado), com "sem identificação" em destaque no topo.
- Detalhe com foto, linha do tempo (quem recebeu, repasses, decisão, contato) e, em pedido parado, os telefones dos responsáveis.
- Encerrar pedido sem identificação com motivo obrigatório (RN14).
- **Liberação manual** com justificativa obrigatória, só para cadastrados (RF29, cenário 5).
- "No laboratório agora" e histórico do dia com **entrada, saída e quem autorizou** (RF03, RF04, RF21), além do status da tela da porta.

**Mocks e contrato (S7)**
- `frontend/js/api.js`: as telas chamam só esta camada. Em modo `mock` ela lê os JSON por `fetch()` e guarda o estado no `localStorage`, para a tela da porta e o painel conversarem entre abas. Para usar a API do Lucas, basta trocar `MODO` e `BASE_URL`.
- `fila.json` e `historico.json` no novo formato; novos `laboratorio.json` e `usuarios.json`.
- `api-contrato.md` com todos os endpoints. **Falta a aprovação do Lucas.**

## Como testar
1. Abrir a pasta no VS Code e iniciar o Live Server.
2. Aba 1: `http://localhost:5500/frontend/recepcao/?cursor=1` (tela da porta).
3. Aba 2: `http://localhost:5500/frontend/atendente/` (painel).
4. Fazer um pedido como visitante na aba 1, ver o pedido aparecer na aba 2 e decidir pela caixa de simulação. A tela da porta muda sozinha.
5. Credenciais de teste: ver o final de `frontend/mocks/api-contrato.md` (ex.: matrícula `20241BSI0012`, PIN `1234`).
6. Kiosk no Windows: `Start-Process chrome -ArgumentList "--kiosk", "--app=http://localhost:5500/frontend/recepcao/"`

## Pendências e dúvidas para a equipe
- Lucas: aprovar o `api-contrato.md` (critério da S7).
- **Figma:** o protótipo da S4 ainda segue o modelo antigo (CPF, atendente aprovando). Precisa ser atualizado para espelhar o código (ver `prototipos/link-figma-prototipo.md`).
- D1 (fechadura): a tela está como **abertura assistida** ("aguarde a abertura da porta").
- D2 (credencial): implementei matrícula + PIN; QR code fica para depois, se escolhido.
- D3 (canal): a decisão do responsável está simulada no painel.
- Pedido sem foto: só é permitido quando a câmera falha; quem recusa a foto vai para "Chamar atendente". Confirmar com a equipe (ponto em aberto do documento).
- Registro de saída: proposta de "identificar de novo = saída". Confirmar com a equipe.
- Prazo P de retenção da foto: ainda "a definir"; a tela mostra esse texto.