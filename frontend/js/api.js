/*
 * Porteiro Digital — camada de acesso à API (frontend)
 *
 * As telas (recepção e atendente) só chamam as funções de `Api`.
 *   MODO 'mock' → o backend é simulado no navegador: os dados iniciais vêm de
 *                 /mocks/*.json via fetch() e o estado do dia fica no localStorage,
 *                 compartilhado entre as abas (tela da porta + painel).
 *   MODO 'real' → as mesmas funções chamam a API do backend (ver mocks/api-contrato.md).
 * Quando a API ficar pronta, basta trocar MODO e BASE_URL. Nenhuma tela muda.
 *
 * Todas as funções devolvem uma Promise com o corpo da resposta. Em caso de erro,
 * o corpo tem o formato { erro: 'codigo', mensagem: '...' }.
 */
const API_CONFIG = {
  MODO: 'mock',                       // 'mock' | 'real'
  BASE_URL: 'http://servidor/api',    // usado só no modo real
  MOCKS: '../mocks'                   // pasta dos JSON de exemplo (relativa às telas)
};

const Api = (() => {
  const real = () => API_CONFIG.MODO === 'real';

  async function http(metodo, caminho, corpo) {
    try {
      const r = await fetch(API_CONFIG.BASE_URL + caminho, {
        method: metodo,
        headers: { 'Content-Type': 'application/json' },
        body: corpo ? JSON.stringify(corpo) : undefined
      });
      const dados = await r.json().catch(() => ({}));
      if (!r.ok && !dados.erro) return { erro: 'falha_servidor', mensagem: 'Erro ' + r.status };
      return dados;
    } catch (e) {
      return { erro: 'sem_conexao', mensagem: 'Sem conexão com o servidor.' };
    }
  }

  return {
    laboratorio:      ()      => real() ? http('GET', '/laboratorio') : Mock.laboratorio(),
    listarPedidos:    ()      => real() ? http('GET', '/pedidos?data=hoje') : Mock.listarPedidos(),
    obterPedido:      (id)    => real() ? http('GET', `/pedidos/${id}`) : Mock.obterPedido(id),
    criarPedido:      (dados) => real() ? http('POST', '/pedidos', dados) : Mock.criarPedido(dados),
    chamarAtendente:  ()      => real() ? http('POST', '/pedidos/sem-identificacao') : Mock.chamarAtendente(),
    deixarContato:    (id, d) => real() ? http('POST', `/pedidos/${id}/contato`, d) : Mock.deixarContato(id, d),
    encerrarPedido:   (id, d) => real() ? http('POST', `/pedidos/${id}/encerramento`, d) : Mock.encerrarPedido(id, d),
    identificar:      (dados) => real() ? http('POST', '/acessos/credencial', dados) : Mock.identificar(dados),
    liberacaoManual:  (dados) => real() ? http('POST', '/acessos/liberacao-manual', dados) : Mock.liberacaoManual(dados),
    listarAcessos:    ()      => real() ? http('GET', '/acessos?data=hoje') : Mock.listarAcessos(),
    listarAvisos:     ()      => real() ? http('GET', '/avisos?data=hoje') : Mock.listarAvisos(),
    sinalTela:        ()      => real() ? http('POST', '/telas/sinal') : Mock.sinalTela(),
    statusTela:       ()      => real() ? http('GET', '/telas/status') : Mock.statusTela(),
    // A decisão do responsável chega pelo canal de mensagens (D3), não pelo frontend.
    // Esta função existe só para SIMULAR o celular do responsável durante os testes.
    simularDecisao:   (id, d) => real() ? Promise.resolve({ erro: 'indisponivel', mensagem: 'No modo real a decisão vem do canal de mensagens.' }) : Mock.decidir(id, d),
    // Avisa quando os dados mudarem em outra aba (só no modo mock).
    aoMudar: (fn) => window.addEventListener('storage', e => { if (e.key === Mock.CHAVE) fn(); })
  };
})();

/* ------------------------------------------------------------------ */
/* Simulação do backend (somente para desenvolvimento e testes)        */
/* ------------------------------------------------------------------ */
const Mock = (() => {
  const CHAVE = 'porteiro-digital-mock-v2';
  let estaticos = null;

  const agoraISO = () => new Date().toISOString();
  const hojeStr = () => new Date().toDateString();
  const normalizar = (t) => (t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();

  async function json(nome) {
    const r = await fetch(`${API_CONFIG.MOCKS}/${nome}`);
    if (!r.ok) throw new Error('Não foi possível carregar ' + nome);
    return r.json();
  }

  async function carregarEstaticos() {
    if (!estaticos) {
      const [lab, usuarios] = await Promise.all([json('laboratorio.json'), json('usuarios.json')]);
      estaticos = { lab, usuarios };
    }
    return estaticos;
  }

  // Os exemplos dos JSON são "movidos" para a data de hoje, para o histórico do dia ter dados.
  function paraHoje(iso) {
    if (!iso) return iso;
    const d = new Date(iso), h = new Date();
    h.setHours(d.getHours(), d.getMinutes(), d.getSeconds(), 0);
    return h.toISOString();
  }

  function ler() {
    try { return JSON.parse(localStorage.getItem(CHAVE)); } catch (e) { return null; }
  }
  function salvar(s) { localStorage.setItem(CHAVE, JSON.stringify(s)); }

  async function estado() {
    const { lab } = await carregarEstaticos();
    let s = ler();
    if (!s || s.dia !== hojeStr()) {
      const [fila, historico] = await Promise.all([json('fila.json'), json('historico.json')]);
      fila.forEach(p => {
        p.criado_em = paraHoje(p.criado_em);
        p.notificados.forEach(n => n.em = paraHoje(n.em));
        if (p.decisao) p.decisao.em = paraHoje(p.decisao.em);
        if (p.encerramento) p.encerramento.em = paraHoje(p.encerramento.em);
        if (p.contato) p.contato.em = paraHoje(p.contato.em);
      });
      historico.forEach(a => { a.entrada = paraHoje(a.entrada); a.saida = paraHoje(a.saida); });
      s = { dia: hojeStr(), seq: 100, pedidos: fila, acessos: historico, tentativas: {}, avisos: [], sinal_tela: null };
    }
    if (processarPrazos(s, lab)) salvar(s);
    return s;
  }

  const nomeResp = (lab, id) => (lab.responsaveis.find(r => r.id === id) || {}).nome || id;
  const proximoId = (s, prefixo) => `${prefixo}-${++s.seq}`;

  function avisar(s, para, texto, pedido) {
    s.avisos.push({ para, texto, pedido: pedido || null, em: agoraISO() });
  }

  // RF27: primeiro o responsável escolhido (ou o 1º da lista); após T1, o próximo; após 2×T1, todos.
  function ordemAcionamento(p, lab) {
    const ids = lab.responsaveis.map(r => r.id);
    return p.falar_com && ids.includes(p.falar_com) ? [p.falar_com, ...ids.filter(i => i !== p.falar_com)] : ids;
  }

  function processarPrazos(s, lab) {
    let mudou = false;
    const agora = Date.now();
    for (const p of s.pedidos) {
      if (p.status !== 'pendente' && p.status !== 'sem_identificacao') continue;
      const inicio = Date.parse(p.criado_em);
      const minutos = (agora - inicio) / 60000;
      if (minutos >= lab.T2_min) {                       // T2: pedido expira
        p.status = 'expirado';
        p.expirado_em = new Date(inicio + lab.T2_min * 60000).toISOString();
        if (p.tipo === 'visitante') avisar(s, 'atendente', `Pedido ${p.id} (${p.nome}) expirou sem resposta.`, p.id);
        mudou = true;
        continue;
      }
      if (p.status !== 'pendente') continue;
      const ordem = ordemAcionamento(p, lab);
      const etapa = minutos < lab.T1_min ? 0 : minutos < 2 * lab.T1_min ? 1 : 2;
      const alvo = etapa === 0 ? ordem.slice(0, 1) : etapa === 1 ? ordem.slice(0, 2) : ordem;
      alvo.forEach((id, i) => {
        if (p.notificados.some(n => n.responsavel === id)) return;
        const atraso = Math.min(i, 2) * lab.T1_min * 60000;
        p.notificados.push({ responsavel: id, em: new Date(inicio + atraso).toISOString() });
        avisar(s, id, `Pedido de entrada no ${lab.nome}: ${p.nome}, sem cadastro. Motivo: ${p.motivo}.`, p.id);
        if (i === 1) avisar(s, ordem[0], `Sem resposta em ${lab.T1_min} min: o pedido de ${p.nome} foi repassado a ${nomeResp(lab, id)}.`, p.id);
        mudou = true;
      });
    }
    return mudou;
  }

  function registrarEntrada(s, pessoa, origem, extra) {
    const a = Object.assign({ id: proximoId(s, 'A'), pessoa, entrada: agoraISO(), saida: null, origem, autorizado_por: null, justificativa: null }, extra || {});
    s.acessos.push(a);
    return a;
  }

  /* ---- Pedidos de visitantes ---- */

  async function laboratorio() {
    const { lab } = await carregarEstaticos();
    // O PIN e os bloqueios não saem do servidor; a tela recebe só o necessário.
    return {
      id: lab.id, nome: lab.nome, modo: lab.modo, abertura: lab.abertura,
      T1_min: lab.T1_min, T2_min: lab.T2_min, prazo_retencao_foto: lab.prazo_retencao_foto,
      motivos: lab.motivos,
      responsaveis: lab.responsaveis.map(r => ({ id: r.id, nome: r.nome, telefone: r.telefone }))
    };
  }

  async function listarPedidos() {
    const s = await estado();
    return s.pedidos.slice().sort((a, b) => b.criado_em.localeCompare(a.criado_em));
  }

  async function obterPedido(id) {
    const s = await estado();
    return s.pedidos.find(p => p.id === id) || { erro: 'nao_encontrado', mensagem: 'Pedido não encontrado.' };
  }

  async function criarPedido(dados) {
    const { lab } = await carregarEstaticos();
    const s = await estado();
    const nome = (dados.nome || '').trim();
    if (!nome || !(dados.motivo || '').trim()) return { erro: 'dados_incompletos', mensagem: 'Informe nome e motivo.' };

    // RN06: pessoa bloqueada não gera pedido aos responsáveis.
    if (lab.visitantes_bloqueados.some(b => normalizar(b) === normalizar(nome))) {
      avisar(s, 'atendente', `Tentativa de pedido de pessoa bloqueada: ${nome}.`);
      salvar(s);
      return { erro: 'bloqueado', mensagem: 'Acesso bloqueado.' };
    }

    const p = {
      id: proximoId(s, 'P'), tipo: 'visitante', nome, motivo: dados.motivo.trim(),
      falar_com: dados.falar_com || null, foto: dados.foto || null, sem_foto: !dados.foto,
      criado_em: agoraISO(), status: 'pendente', notificados: [], decisao: null, encerramento: null, contato: null
    };

    // RF05: no modo "apenas registro" a porta não barra ninguém; a visita só é registrada.
    if (lab.modo === 'registro') {
      p.status = 'registrado';
      s.pedidos.push(p);
      registrarEntrada(s, { tipo: 'visitante', id: p.id, nome, perfil: 'visitante' }, 'registro_visitante');
      salvar(s);
      return p;
    }

    s.pedidos.push(p);
    processarPrazos(s, lab);  // notifica o primeiro responsável
    salvar(s);
    return p;
  }

  async function chamarAtendente() {
    const s = await estado();
    const p = {
      id: proximoId(s, 'P'), tipo: 'sem_identificacao', nome: null, motivo: null, falar_com: null,
      foto: null, sem_foto: true, criado_em: agoraISO(), status: 'sem_identificacao',
      notificados: [], decisao: null, encerramento: null, contato: null
    };
    s.pedidos.push(p);
    avisar(s, 'atendente', 'Pessoa na porta chamou o atendente (sem identificação).', p.id);
    salvar(s);
    return p;
  }

  async function decidir(id, { responsavel, acao, validade }) {
    const { lab } = await carregarEstaticos();
    const s = await estado();
    const p = s.pedidos.find(x => x.id === id);
    if (!p) return { erro: 'nao_encontrado', mensagem: 'Pedido não encontrado.' };
    if (!lab.responsaveis.some(r => r.id === responsavel)) return { erro: 'sem_permissao', mensagem: 'Só responsáveis do laboratório decidem (RN04).' };
    // RN15: vale a primeira decisão; pedido expirado não pode mais ser autorizado.
    if (p.status === 'expirado') return { erro: 'expirado', mensagem: 'Este pedido expirou.', contato: p.contato };
    if (p.status !== 'pendente') return { erro: 'ja_resolvido', mensagem: `Este pedido já foi resolvido por ${p.decisao ? nomeResp(lab, p.decisao.por) : 'outra pessoa'}.` };

    p.decisao = { por: responsavel, acao, validade: acao === 'autorizar' ? (validade || 'esta_entrada') : null, em: agoraISO() };
    p.status = acao === 'autorizar' ? 'autorizado' : 'negado';
    if (p.status === 'autorizado') {
      registrarEntrada(s, { tipo: 'visitante', id: p.id, nome: p.nome, perfil: 'visitante' }, 'visita_autorizada', { autorizado_por: nomeResp(lab, responsavel) });
    }
    p.notificados.filter(n => n.responsavel !== responsavel).forEach(n =>
      avisar(s, n.responsavel, `O pedido de ${p.nome} já foi resolvido por ${nomeResp(lab, responsavel)}.`, p.id));
    salvar(s);
    return p;
  }

  async function deixarContato(id, { contato }) {
    const { lab } = await carregarEstaticos();
    const s = await estado();
    const p = s.pedidos.find(x => x.id === id);
    if (!p) return { erro: 'nao_encontrado', mensagem: 'Pedido não encontrado.' };
    const podeDeixar = p.status === 'expirado' || (p.status === 'negado' && p.decisao && p.decisao.acao === 'negar_agendar');
    if (!podeDeixar) return { erro: 'nao_permitido', mensagem: 'Este pedido não aceita contato.' };
    if (!(contato || '').trim()) return { erro: 'dados_incompletos', mensagem: 'Informe um e-mail ou telefone.' };
    p.contato = { valor: contato.trim(), em: agoraISO() };
    const para = (p.decisao && p.decisao.por) || p.falar_com || lab.responsaveis[0].id;
    avisar(s, para, `${p.nome} deixou um contato para agendar uma visita: ${p.contato.valor}.`, p.id);
    salvar(s);
    return p;
  }

  async function encerrarPedido(id, { operador, motivo }) {
    const s = await estado();
    const p = s.pedidos.find(x => x.id === id);
    if (!p) return { erro: 'nao_encontrado', mensagem: 'Pedido não encontrado.' };
    // RN14: o operador só encerra pedidos sem identificação.
    if (p.status !== 'sem_identificacao') return { erro: 'nao_permitido', mensagem: 'Só pedidos sem identificação podem ser encerrados pelo operador (RN14).' };
    if (!(motivo || '').trim()) return { erro: 'motivo_obrigatorio', mensagem: 'Informe o motivo do encerramento.' };
    p.status = 'encerrado';
    p.encerramento = { por: operador, motivo: motivo.trim(), em: agoraISO() };
    salvar(s);
    return p;
  }

  /* ---- Usuários cadastrados ---- */

  async function identificar({ matricula, pin }) {
    const { lab, usuarios } = await carregarEstaticos();
    const s = await estado();
    const m = (matricula || '').trim().toUpperCase();
    const u = usuarios.find(x => x.matricula.toUpperCase() === m);
    const t = s.tentativas[m] || { erros: 0, bloqueado_ate: null };

    if (t.bloqueado_ate && Date.parse(t.bloqueado_ate) > Date.now()) {
      return { erro: 'bloqueio_temporario', mensagem: 'Credencial bloqueada temporariamente.', ate: t.bloqueado_ate };
    }
    if (!u || sha256(`porteiro:${u.matricula}:${pin}`) !== u.pin_hash) {
      t.erros += 1;
      t.bloqueado_ate = null;
      if (t.erros >= lab.N_tentativas) {          // RNF04: bloqueio após N tentativas
        t.erros = 0;
        t.bloqueado_ate = new Date(Date.now() + lab.bloqueio_temporario_min * 60000).toISOString();
        lab.responsaveis.filter(r => r.coordenacao).forEach(r =>
          avisar(s, r.id, `Credencial ${m} bloqueada temporariamente após ${lab.N_tentativas} tentativas inválidas.`));
      }
      s.tentativas[m] = t;
      salvar(s);
      return t.bloqueado_ate
        ? { erro: 'bloqueio_temporario', mensagem: 'Credencial bloqueada temporariamente.', ate: t.bloqueado_ate }
        : { erro: 'credencial_invalida', mensagem: 'Matrícula ou PIN incorretos.', restantes: lab.N_tentativas - t.erros };
    }
    delete s.tentativas[m];

    if (u.bloqueado) { salvar(s); return { erro: 'bloqueado', mensagem: 'Acesso bloqueado.' }; }         // RN06
    if (!u.ativo) { salvar(s); return { erro: 'inativo', mensagem: 'Cadastro inativo.' }; }              // RN07
    if (lab.uso_restrito && !(lab.uso_restrito.reserva || []).includes(u.matricula)) {                     // RF07 / RN09
      salvar(s);
      return { erro: 'uso_restrito', mensagem: 'Laboratório em uso restrito.', ate: lab.uso_restrito.ate };
    }

    // RF04 (proposta): se a pessoa já está dentro, a identificação registra a saída.
    const aberto = s.acessos.find(a => a.pessoa.id === u.matricula && !a.saida);
    if (aberto) {
      aberto.saida = agoraISO();
      salvar(s);
      return { tipo: 'saida', nome: u.nome, acesso: aberto };
    }
    const a = registrarEntrada(s, { tipo: 'usuario', id: u.matricula, nome: u.nome, perfil: u.perfil }, 'credencial');
    salvar(s);
    return { tipo: 'entrada', nome: u.nome, acesso: a };
  }

  async function liberacaoManual({ matricula, justificativa, operador }) {
    const { lab, usuarios } = await carregarEstaticos();
    const s = await estado();
    if (!(justificativa || '').trim()) return { erro: 'justificativa_obrigatoria', mensagem: 'A justificativa é obrigatória.' };
    const u = usuarios.find(x => x.matricula.toUpperCase() === (matricula || '').trim().toUpperCase());
    // RN14: liberação manual só para usuário cadastrado e ativo.
    if (!u || !u.ativo) return { erro: 'nao_cadastrado', mensagem: 'Pessoa não cadastrada neste laboratório. A liberação manual não é permitida; siga o fluxo de visitante.' };
    if (u.bloqueado) return { erro: 'bloqueado', mensagem: 'Usuário bloqueado pela coordenação.' };
    const a = registrarEntrada(s, { tipo: 'usuario', id: u.matricula, nome: u.nome, perfil: u.perfil }, 'liberacao_manual',
      { autorizado_por: operador, justificativa: justificativa.trim() });
    lab.responsaveis.filter(r => r.coordenacao).forEach(r =>
      avisar(s, r.id, `Liberação manual no ${lab.nome}: ${u.nome}, por ${operador}. Justificativa: ${a.justificativa}`));
    salvar(s);
    return a;
  }

  async function listarAcessos() {
    const s = await estado();
    return s.acessos.slice().sort((a, b) => b.entrada.localeCompare(a.entrada));
  }

  async function listarAvisos() {
    const s = await estado();
    return s.avisos.slice().reverse();
  }

  /* ---- Sinal da tela da porta (para o painel saber se ela está online) ---- */

  async function sinalTela() {
    const s = await estado();
    s.sinal_tela = agoraISO();
    salvar(s);
    return { ok: true };
  }

  async function statusTela() {
    const s = await estado();
    const ultimo = s.sinal_tela ? Date.parse(s.sinal_tela) : null;
    return { online: !!ultimo && Date.now() - ultimo < 30000, ultimo_sinal: s.sinal_tela };
  }

  /* SHA-256 em JavaScript puro (o crypto.subtle não existe em http:// fora do localhost,
     e o tablet acessa pela rede local). No sistema real o hash fica no servidor. */
  function sha256(ascii) {
    function rr(v, a) { return (v >>> a) | (v << (32 - a)); }
    var pow = Math.pow, maxWord = pow(2, 32), result = '', words = [], bitLen = ascii.length * 8;
    var hash = [], k = [], primes = 0, composite = {}, i, j;
    for (var c = 2; primes < 64; c++) {
      if (!composite[c]) {
        for (i = 0; i < 313; i += c) composite[i] = c;
        hash[primes] = (pow(c, .5) * maxWord) | 0;
        k[primes++] = (pow(c, 1 / 3) * maxWord) | 0;
      }
    }
    ascii += '\x80';
    while (ascii.length % 64 - 56) ascii += '\x00';
    for (i = 0; i < ascii.length; i++) {
      j = ascii.charCodeAt(i);
      if (j >> 8) return '';
      words[i >> 2] |= j << ((3 - i) % 4) * 8;
    }
    words[words.length] = ((bitLen / maxWord) | 0);
    words[words.length] = bitLen;
    for (j = 0; j < words.length;) {
      var w = words.slice(j, j += 16), old = hash;
      hash = hash.slice(0, 8);
      for (i = 0; i < 64; i++) {
        var w15 = w[i - 15], w2 = w[i - 2], a = hash[0], e = hash[4];
        var t1 = hash[7] + (rr(e, 6) ^ rr(e, 11) ^ rr(e, 25)) + ((e & hash[5]) ^ ((~e) & hash[6])) + k[i] +
          (w[i] = (i < 16) ? w[i] : (w[i - 16] + (rr(w15, 7) ^ rr(w15, 18) ^ (w15 >>> 3)) + w[i - 7] + (rr(w2, 17) ^ rr(w2, 19) ^ (w2 >>> 10))) | 0);
        var t2 = (rr(a, 2) ^ rr(a, 13) ^ rr(a, 22)) + ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));
        hash = [(t1 + t2) | 0].concat(hash);
        hash[4] = (hash[4] + t1) | 0;
      }
      for (i = 0; i < 8; i++) hash[i] = (hash[i] + old[i]) | 0;
    }
    for (i = 0; i < 8; i++) for (j = 3; j + 1; j--) { var b = (hash[i] >> (j * 8)) & 255; result += ((b < 16) ? 0 : '') + b.toString(16); }
    return result;
  }

  return {
    CHAVE, laboratorio, listarPedidos, obterPedido, criarPedido, chamarAtendente, decidir,
    deixarContato, encerrarPedido, identificar, liberacaoManual, listarAcessos, listarAvisos,
    sinalTela, statusTela, sha256
  };
})();
