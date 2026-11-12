/*
 * Porteiro Digital — camada de acesso à API (frontend)
 *
 * As telas (recepção e atendente) só chamam as funções de `Api`.
 *   MODO 'mock' → os dados iniciais vêm de /mocks/*.json via fetch() e o estado do dia
 *                 fica no localStorage, compartilhado entre as abas (tablet + atendente).
 *   MODO 'real' → as mesmas funções chamam a API do backend (ver mocks/api-contrato.md).
 * Quando a API ficar pronta, basta trocar MODO e BASE_URL. Nenhuma tela muda.
 */
const API_CONFIG = {
  MODO: 'mock',                       // 'mock' | 'real'
  BASE_URL: 'http://servidor/api',    // usado só no modo real
  MOCKS: '../mocks'                   // pasta dos JSON de exemplo (relativa às telas)
};

const Api = (() => {
  const CHAVE = 'porteiro-digital-mock';
  const real = () => API_CONFIG.MODO === 'real';

  async function http(metodo, caminho, corpo) {
    const r = await fetch(API_CONFIG.BASE_URL + caminho, {
      method: metodo,
      headers: { 'Content-Type': 'application/json' },
      body: corpo ? JSON.stringify(corpo) : undefined
    });
    if (!r.ok) throw new Error('Erro ' + r.status);
    return r.json();
  }

  async function json(nome) {
    const r = await fetch(`${API_CONFIG.MOCKS}/${nome}`);
    if (!r.ok) throw new Error('Não foi possível carregar ' + nome);
    return r.json();
  }

  /* ---- Simulação do backend (somente modo mock) ---- */
  const ler = () => { try { return JSON.parse(localStorage.getItem(CHAVE)); } catch (e) { return null; } };
  const salvar = (s) => localStorage.setItem(CHAVE, JSON.stringify(s));

  // Recomeça a partir dos JSON a cada dia.
  async function estado() {
    let s = ler();
    if (!s || s.dia !== new Date().toDateString()) {
      const [fila, historico] = await Promise.all([json('fila.json'), json('historico.json')]);
      s = { dia: new Date().toDateString(), fila, historico };
      salvar(s);
    }
    return s;
  }

  return {
    // GET /responsaveis — lista para o visitante escolher quem vai visitar
    listarResponsaveis: () => real() ? http('GET', '/responsaveis') : json('responsaveis.json'),

    // GET /fila — visitantes do dia
    listarFila: async () => real() ? http('GET', '/fila') : (await estado()).fila,

    // GET /historico — registros do dia (nome, hora de entrada, status)
    listarHistorico: async () => real() ? http('GET', '/historico') : (await estado()).historico,

    // POST /visitantes — cadastro feito no tablet
    criarVisitante: async (dados) => {
      if (real()) return http('POST', '/visitantes', dados);
      const s = await estado();
      const v = { id: Math.max(0, ...s.fila.map(x => x.id)) + 1, ...dados, status: 'aguardando' };
      s.fila.push(v);
      salvar(s);
      return v;
    },

    // PATCH /visitantes/{id}/status — atendente muda o status (em_aprovacao, autorizado, recusado)
    mudarStatus: async (id, status) => {
      if (real()) return http('PATCH', `/visitantes/${id}/status`, { status });
      const s = await estado();
      const v = s.fila.find(x => x.id === id);
      if (!v) throw new Error('Visitante não encontrado');
      v.status = status;
      if (status === 'autorizado' || status === 'recusado') {
        s.historico.push({ nome: v.nome, hora_entrada: v.hora_chegada, status });
      }
      salvar(s);
      return v;
    },

    // Avisa quando outra aba (o tablet) mudou os dados — só no modo mock.
    aoMudar: (fn) => window.addEventListener('storage', e => { if (e.key === CHAVE) fn(); })
  };
})();
