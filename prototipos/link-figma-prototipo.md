# Protótipo Figma — Porteiro Digital (S3/S4)

**Link do protótipo:** https://www.figma.com/design/vEiAqx2HC7uIT2Rw3NXxmq/S4?node-id=0-1&p=f

**Wireframes lo-fi (S3):** `prototipos/wireframes-lofi.pdf`

## Telas

**Visitante (tablet):**
1. Boas-vindas: "Bem-vindo!" + botão "Toque aqui para iniciar"
2. Formulário: Nome, CPF, Motivo (digitados pelo visitante) e Responsável (lista vinda da API) + "Avançar"
3. "Registro concluído!" + "Sair". A hora de entrada é calculada pelo frontend.

**Atendente (desktop):**
- Fila de visitantes (nome + hora), atualizada via API com os dados do tablet
- Detalhe: Nome, CPF, Motivo, Responsável
- "Aprovar" e "Recusar" atualizam o status no banco
- Tabela: Nome, Hora de entrada, Status

O código em `frontend/recepcao/` e `frontend/atendente/` segue estas telas.

## Decisões de design

| Item | Escolha | Por quê |
|---|---|---|
| Cor primária | Azul `#004c97` | Institucional, contraste alto com branco |
| Aprovar / autorizado | Verde `#1e7e34` | Ação positiva |
| Recusar / erro | Vermelho `#c62828` | Ação negativa |
| Aguardando | Laranja `#b35c00` | Chama atenção para quem está esperando |
| Em aprovação | Azul `#0b5cad` | Em andamento |
| Fundo | Cinza-azulado claro `#eef2f7` com cartões brancos | Neutro, não cansa |
| Fonte | Segoe UI / Roboto / Arial (sem serifa, do sistema) | Não depende de internet no kiosk |
| Tamanhos (tablet) | Base 20px, título 48px, botões com 60px ou mais de altura | Legível a ~50 cm, alvo de toque confortável |
| Tamanhos (desktop) | Base 15px | Mais informação por tela para o atendente |

> Verificar o contraste AA no plugin *Contrast* do Figma.

## Atenção: divergências com o Documento de Requisitos v1.0

O protótipo é anterior ao documento consolidado (03/11/2026). Pontos para a equipe decidir:
- O documento não pede **CPF** (RF10, coleta mínima da LGPD).
- Pelo documento, o **atendente não aprova** visitantes; quem decide é o responsável pelo celular (RN14, RF11).
- O documento pede **foto** do visitante (RF16), status do pedido na tela (RF25), entrada de cadastrados por credencial (RF01) e "chamar atendente" (RF31), que não estão no protótipo.
