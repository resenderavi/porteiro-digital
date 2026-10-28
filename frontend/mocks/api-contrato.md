# Contrato de API — Porteiro Digital (S7)

Documento de alinhamento entre o Frontend (Ravi) e o Backend (Lucas) para integração das interfaces de Receção e Atendente.

---

## 1. Listar Fila de Visitantes
- **Método:** `GET`
- **Endpoint futuro:** `/api/fila` (Mock atual: `../mocks/fila.json`)

### Response (200 OK):
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