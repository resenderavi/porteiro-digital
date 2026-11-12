# Protótipo Figma — Porteiro Digital (S3/S4)

**Link do protótipo:** https://www.figma.com/design/vEiAqx2HC7uIT2Rw3NXxmq/S4?node-id=0-1&p=f

## O que o protótipo tem hoje

**Tela do visitante (tablet):**
1. Boas-vindas: "Bem-Vindo!" + botão "Toque aqui para iniciar"
2. Formulário: Nome, CPF, Motivo, Responsável (lista vinda da API) + "Avançar"
3. "Registro concluído!" + "Sair" (hora de entrada calculada pelo frontend)

**Tela do atendente (desktop):**
- Fila de visitantes (nome + hora), atualizada via API
- Detalhe: Nome, CPF, Motivo, Responsável
- Botões "Aprovar" e "Recusar" (atualizam o status no banco)
- Tabela: Nome, Hora de entrada, Status

## Decisões de design (como está no código)

| Item | Escolha | Por quê |
|---|---|---|
| Cor primária | Azul `#004c97` | Institucional, contraste alto com branco |
| Ação positiva | Verde `#1e7e34` | Confirmar, autorizado |
| Ação negativa / erro | Vermelho `#c62828` | Negado, bloqueado |
| Alerta | Laranja `#a35a00` | Pendente, repasse, expirado |
| Fundo | Cinza-azulado claro `#eef2f7` com cartões brancos | Neutro, não cansa |
| Fonte | Segoe UI / Roboto / Arial (sem serifa, do sistema) | Não depende de internet no kiosk |
| Tamanhos (tablet) | Base 20px, títulos 32px, botões com 60px ou mais de altura | Legível a ~50 cm, alvo de toque confortável |
| Tamanhos (desktop) | Base 15px | Mais informação por tela para o atendente |

## O código agora segue o Documento de Requisitos, não o protótipo

O protótipo foi feito antes do documento consolidado (03/11/2026). O código foi atualizado para o documento; **o Figma ainda precisa ser** (a S13 pede que o Figma espelhe o código).

| No protótipo | No código atual (documento) | Requisito |
|---|---|---|
| Botão único "Toque aqui para iniciar" | Duas opções: **Tenho cadastro** e **Sou visitante** | Cenário 1, passo 1 |
| — | Tela de **aviso de privacidade** antes do formulário | RNF03, RN13 |
| Campo **CPF** | **Removido** (coleta mínima) | RF10, R1 |
| Motivo como campo de texto | Lista de opções + "Outro" | Cenário 1, passo 3 |
| "Responsável" obrigatório | "Com quem deseja falar?" **opcional** (+ "Não sei") | RF10 |
| — | **Foto** do visitante, com "tirar outra" | RF16 |
| — | **Confirmação** antes de enviar | S5 |
| "Registro concluído!" | Tela de **espera** com status e tempo restante; depois autorizado / negado / expirado | RF25, RF27 |
| — | Deixar contato quando negado ou expirado | RF26 |
| — | Botão **Chamar atendente** | RF31 |
| — | Entrada de cadastrados com **matrícula + PIN** | RF01, D2 |
| Atendente com **Aprovar / Recusar** | Atendente **não autoriza** visitante; quem decide é o responsável pelo celular | RN14, RF11 |
| — | Encerrar pedido sem identificação (motivo obrigatório) | RN14 |
| — | **Liberação manual** com justificativa | RF29 |
| Detalhe com CPF | Detalhe com foto, motivo e linha do tempo (quem recebeu, repasses, quem decidiu) | RF12, RF28 |
| Tabela: Nome, Hora de entrada, Status | Tabela: Nome, Perfil, Entrada, **Saída**, Como entrou / quem autorizou | RF03, RF04, RF21 |

## Telas para acrescentar no Figma

Tablet: inicial (2 opções), privacidade, dados, foto, confirmação, aguardando, autorizado, negado (com e sem agendamento), expirado, deixar contato, chamar atendente, credencial (matrícula + teclado de PIN), acesso bloqueado.

Desktop: painel sem Aprovar/Recusar, pedido "sem identificação" em destaque, janela de liberação manual, "no laboratório agora", status da tela da porta.
