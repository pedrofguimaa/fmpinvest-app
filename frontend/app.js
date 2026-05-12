function getApiBaseUrl() {
  const customApiUrl = window.FMP_API_URL;
  if (customApiUrl) return String(customApiUrl).replace(/\/$/, '');

  if (window.location.protocol === 'file:') return 'http://localhost:3000';

  const isLocalhost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
  if (isLocalhost && window.location.port !== '3000') return 'http://localhost:3000';

  return window.location.origin;
}

const API_BASE_URL = getApiBaseUrl();
const STORAGE_KEY_FALLBACK = 'fmpinvest_assets_local';
const STORAGE_KEY_PROFILE = 'fmpinvest_profile_analysis';
const STORAGE_KEY_LAST_TAB = 'fmpinvest_last_dashboard_tab';

const state = {
  profileAnalysis: null,
  perfilInvestidor: null,
  assets: [],
  portfolioMetrics: null,
  recommendations: [],
  concentrationChartView: 'bar',
};

const chartsCarteira = {
  categorias: null,
  rendaFixaVariavel: null,
  concentracao: null,
  score: null,
  categoriasDetalhe: null,
  risco: null,
  liquidez: null,
  valorAtivos: null,
  totalAportado: null,
};

let fireworksCanvas = null;
let fireworksContext = null;
let fireworksAnimation = null;
let ativoEmEdicaoIndex = null;
let mouseFrameId = null;
let chartsRenderFrameId = null;
let chartsLastSignature = '';
let panelSwitchTimeoutId = null;
let openCustomSelect = null;

const perguntasPerfil = [
  {
    id: 'userName',
    pergunta: 'Qual e o seu nome?',
    tipo: 'text',
    placeholder: 'Digite seu nome',
  },
  {
    id: 'age',
    pergunta: 'Qual e a sua idade?',
    tipo: 'number',
    min: 1,
    placeholder: 'Ex: 32',
  },
  {
    id: 'monthlyIncome',
    pergunta: 'Qual e a sua renda mensal?',
    tipo: 'number',
    min: 0,
    step: '0.01',
    placeholder: 'Ex: 5000',
  },
  {
    id: 'monthlyExpense',
    pergunta: 'Qual e o seu gasto mensal medio?',
    tipo: 'number',
    min: 0,
    step: '0.01',
    placeholder: 'Ex: 3200',
  },
  {
    id: 'monthlyContribution',
    pergunta: 'Quanto voce pretende investir por mes?',
    tipo: 'number',
    min: 0,
    step: '0.01',
    placeholder: 'Ex: 600',
  },
  {
    id: 'emergencyReserveAmount',
    pergunta: 'Quanto voce possui de reserva de emergencia?',
    tipo: 'number',
    min: 0,
    step: '0.01',
    placeholder: 'Ex: 10000',
  },
  {
    id: 'mainGoal',
    pergunta: 'Qual e o seu objetivo financeiro principal?',
    tipo: 'text',
    placeholder: 'Ex: aposentadoria, imovel, reserva',
  },
  {
    id: 'goalMonths',
    pergunta: 'Em quantos meses voce quer atingir esse objetivo?',
    tipo: 'number',
    min: 1,
    placeholder: 'Ex: 60',
  },
  {
    id: 'knowledgeLevel',
    pergunta: 'Qual e o seu nivel de conhecimento sobre investimentos?',
    opcoes: ['iniciante', 'intermediario', 'avancado'],
  },
  {
    id: 'riskTolerance',
    pergunta: 'Qual e a sua tolerancia a risco?',
    opcoes: ['baixa', 'media', 'alta'],
  },
  {
    id: 'investmentHorizon',
    pergunta: 'Qual e o seu horizonte de investimento?',
    opcoes: ['curto prazo', 'medio prazo', 'longo prazo'],
  },
  {
    id: 'hasEmergencyReserve',
    pergunta: 'Voce ja possui reserva de emergencia?',
    opcoes: ['sim', 'nao', 'parcialmente'],
  },
  {
    id: 'liquidityPreference',
    pergunta: 'Qual e a sua preferencia de liquidez?',
    opcoes: ['alta', 'media', 'baixa'],
  },
];

let indicePerguntaAtual = 0;
const respostasPerfil = {};

function formatCurrency(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatarMoeda(valor) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(valor || 0));
}

function formatarPercentual(valor) {
  return `${Number(valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
}

function setMessage(element, message, type = '') {
  element.textContent = message;
  element.classList.remove('success', 'error');
  if (type) element.classList.add(type);
}

function salvarPerfilLocal() {
  if (!state.profileAnalysis || !state.perfilInvestidor) return;
  localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify({
    profileAnalysis: state.profileAnalysis,
    perfilInvestidor: state.perfilInvestidor,
    respostasPerfil,
  }));
}

function restaurarPerfilLocal() {
  try {
    const salvo = localStorage.getItem(STORAGE_KEY_PROFILE);
    if (!salvo) return false;
    const dados = JSON.parse(salvo);
    if (!dados?.profileAnalysis || !dados?.perfilInvestidor) return false;

    state.profileAnalysis = dados.profileAnalysis;
    state.perfilInvestidor = dados.perfilInvestidor;
    Object.assign(respostasPerfil, dados.respostasPerfil || {});
    window.perfilInvestidor = state.perfilInvestidor;
    return true;
  } catch (_error) {
    localStorage.removeItem(STORAGE_KEY_PROFILE);
    return false;
  }
}

function normalizarTextoPerfil(texto) {
  return String(texto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function obterOpcaoPerfilPorTexto(pergunta, texto) {
  const textoNormalizado = normalizarTextoPerfil(texto);
  return pergunta.opcoes.find((opcao) => normalizarTextoPerfil(opcao.valor || opcao) === textoNormalizado);
}

function obterValorCampoPerfil(pergunta, resposta) {
  return resposta || '';
}

function formatarOpcaoPerfil(opcao) {
  return String(opcao)
    .split(' ')
    .map((palavra) => palavra.charAt(0).toUpperCase() + palavra.slice(1))
    .join(' ');
}

function obterPerfilExibicao(perfil) {
  if (!perfil) return '-';
  return formatarOpcaoPerfil(perfil);
}

function montarPayloadPerfil() {
  return {
    userName: respostasPerfil.userName,
    age: Number(respostasPerfil.age),
    monthlyIncome: Number(respostasPerfil.monthlyIncome),
    monthlyExpense: Number(respostasPerfil.monthlyExpense),
    monthlyContribution: Number(respostasPerfil.monthlyContribution),
    emergencyReserveAmount: Number(respostasPerfil.emergencyReserveAmount),
    mainGoal: respostasPerfil.mainGoal,
    goalMonths: Number(respostasPerfil.goalMonths),
    knowledgeLevel: respostasPerfil.knowledgeLevel,
    riskTolerance: respostasPerfil.riskTolerance,
    investmentHorizon: respostasPerfil.investmentHorizon,
    hasEmergencyReserve: respostasPerfil.hasEmergencyReserve,
    liquidityPreference: respostasPerfil.liquidityPreference,
  };
}

function obterRespostaPerfil(id) {
  return respostasPerfil[id] || state.profileAnalysis?.[id] || '';
}

function renderizarCampoEdicaoPerfil(pergunta) {
  const valor = obterRespostaPerfil(pergunta.id);
  if (pergunta.opcoes) {
    return `
      <label>${pergunta.pergunta}
        <select id="edit-${pergunta.id}" data-profile-field="${pergunta.id}">
          ${pergunta.opcoes.map((opcao) => `<option value="${opcao}" ${valor === opcao ? 'selected' : ''}>${formatarOpcaoPerfil(opcao)}</option>`).join('')}
        </select>
      </label>
    `;
  }

  return `
    <label>${pergunta.pergunta}
      <input
        id="edit-${pergunta.id}"
        data-profile-field="${pergunta.id}"
        type="${pergunta.tipo}"
        value="${valor}"
        placeholder="${pergunta.placeholder || ''}"
        ${pergunta.min !== undefined ? `min="${pergunta.min}"` : ''}
        ${pergunta.step ? `step="${pergunta.step}"` : ''}
      />
    </label>
  `;
}

async function postData(endpoint, payload) {
  return requestApi(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

async function requestApi(endpoint, options = {}) {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
  });

  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const payload = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    if (isJson) throw new Error(payload.error || 'Erro na requisicao.');
    if (response.status === 404) {
      throw new Error(`Erro 404 na rota ${endpoint}. Reinicie o backend atualizado na porta 3000.`);
    }
    throw new Error(`Erro ${response.status}: resposta inesperada do servidor.`);
  }

  if (!isJson) throw new Error(`Resposta invalida da API (${response.status}).`);
  const data = payload;
  return data;
}

function renderizarPerfil() {
  const box = document.getElementById('profileResult');
  if (!state.perfilInvestidor) {
    box.innerHTML = '<p>Responda o questionario para gerar sua analise inicial.</p>';
    return;
  }

  renderizarResultadoPerfilSimplificado();
}

function obterDescricaoPontuacaoPerfil(pontuacao) {
  if (pontuacao <= 10) return 'Sua pontuacao indica preferencia por seguranca, previsibilidade e baixa volatilidade.';
  if (pontuacao <= 20) return 'Sua pontuacao indica cautela com risco, com abertura limitada para oscilacoes.';
  if (pontuacao <= 30) return 'Sua pontuacao indica equilibrio entre seguranca e busca por crescimento.';
  if (pontuacao <= 40) return 'Sua pontuacao indica boa tolerancia a oscilacoes e aceitacao moderada de risco.';
  return 'Sua pontuacao indica alta tolerancia a oscilacoes e maior aceitacao de risco.';
}

function obterDescricaoPerfil(perfil) {
  const descricoes = {
    'Conservador severo': 'Esse perfil costuma priorizar estabilidade e protecao do patrimonio, evitando grandes oscilacoes.',
    'Conservador moderado': 'Esse perfil prioriza seguranca, mas pode aceitar pequenas exposicoes a risco com controle.',
    Moderado: 'Esse perfil busca equilibrio entre seguranca e crescimento, tolerando riscos moderados.',
    'Medio-alto risco': 'Esse perfil aceita uma parcela maior de risco em busca de potencial de retorno, mantendo diversificacao.',
    'Alto risco': 'Esse perfil demonstra conforto com maior volatilidade e foco de longo prazo, sem abrir mao de diversificacao.',
  };
  return descricoes[perfil] || '';
}

function renderizarResultadoPerfilSimplificado() {
  const box = document.getElementById('profileResult');
  const p = state.perfilInvestidor;
  const perfilExibicao = obterPerfilExibicao(p.investorProfile);

  box.innerHTML = `
    <div class="profile-premium-result">
      <section class="profile-result-hero">
        <div>
          <span class="section-kicker">Perfil do investidor</span>
          <h3>${perfilExibicao}</h3>
          <p>${obterDescricaoPerfil(p.investorProfile)}</p>
        </div>
        <div class="profile-result-badge">
          <span>${p.userName}</span>
          <strong>${perfilExibicao}</strong>
        </div>
      </section>

      <section class="profile-result-grid">
        <article>
          <span>Taxa de investimento</span>
          <strong>${formatarPercentual(p.investmentRate)}</strong>
          <small>${obterDescricaoPontuacaoPerfil(Number(p.score || p.profileScore || 0))}</small>
        </article>
        <article>
          <span>Renda disponivel</span>
          <strong>${formatCurrency(p.availableIncome)}</strong>
          <small>Valor estimado apos despesas mensais.</small>
        </article>
        <article>
          <span>Reserva de emergencia</span>
          <strong>${p.emergencyReserveMonths} meses</strong>
          <small>${p.emergencyReserveStatus}</small>
        </article>
      </section>

      <section class="profile-result-diagnosis">
        <div class="profile-result-section-title">
          <span>Diagnostico inicial</span>
          <strong>Pontos de atencao e leitura comportamental</strong>
        </div>
        <div class="profile-diagnosis-list">
          ${p.diagnosis.map((item) => `<article><span></span><p>${item}</p></article>`).join('')}
        </div>
      </section>

      <section class="profile-result-details">
        <div><span>Objetivo principal</span><strong>${p.mainGoal || '-'}</strong></div>
        <div><span>Horizonte</span><strong>${p.goalMonths || '-'} meses</strong></div>
        <div><span>Conhecimento</span><strong>${formatarOpcaoPerfil(p.knowledgeLevel || '-')}</strong></div>
        <div><span>Tolerancia a risco</span><strong>${formatarOpcaoPerfil(p.riskTolerance || '-')}</strong></div>
      </div>
    </div>
  `;
}

function renderizarEditorPerfil() {
  const box = document.getElementById('profileResult');
  if (!box) return;

  box.innerHTML = `
    <form id="profileEditForm" class="profile-edit-form">
      <div class="profile-edit-banner">
        <span class="section-kicker">Edicao do perfil</span>
        <strong>Atualize os dados que realmente mudaram</strong>
        <p>O score do perfil sera recalculado quando voce salvar as alteracoes.</p>
      </div>
      <div class="profile-edit-fields">
        ${perguntasPerfil.map(renderizarCampoEdicaoPerfil).join('')}
      </div>
      <div class="profile-edit-actions">
        <button type="button" class="secundario" id="btnCancelarEdicaoPerfil">Cancelar</button>
        <button type="submit" id="btnRecalcularPerfil" class="profile-recalculate-btn dashboard-hidden">Recalcular perfil</button>
      </div>
      <p id="profileEditMessage" class="result"></p>
    </form>
  `;

  const form = box.querySelector('#profileEditForm');
  const botaoRecalcular = box.querySelector('#btnRecalcularPerfil');
  form.querySelectorAll('[data-profile-field]').forEach((campo) => {
    campo.addEventListener('input', () => botaoRecalcular.classList.remove('dashboard-hidden'));
    campo.addEventListener('change', () => botaoRecalcular.classList.remove('dashboard-hidden'));
  });
  box.querySelector('#btnCancelarEdicaoPerfil').addEventListener('click', renderizarResultadoPerfil);
  form.addEventListener('submit', recalcularPerfilEditado);
}

async function recalcularPerfilEditado(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const msg = document.getElementById('profileEditMessage');
  perguntasPerfil.forEach((pergunta) => {
    const campo = form.querySelector(`[data-profile-field="${pergunta.id}"]`);
    respostasPerfil[pergunta.id] = String(campo?.value || '').trim();
  });

  const botao = document.getElementById('btnRecalcularPerfil');
  botao.disabled = true;
  botao.textContent = 'Recalculando...';

  try {
    const analise = await postData('/api/profile-analysis', montarPayloadPerfil());
    state.profileAnalysis = analise;
    state.perfilInvestidor = {
      ...analise,
      perfil: obterPerfilExibicao(analise.investorProfile),
    };
    window.perfilInvestidor = state.perfilInvestidor;
    salvarPerfilLocal();
    renderizarResultadoPerfil();
    await atualizarDashboardCarteira();
  } catch (error) {
    botao.disabled = false;
    botao.textContent = 'Recalcular perfil de investidor';
    setMessage(msg, error.message, 'error');
  }
}

function iniciarQuestionarioPerfil() {
  indicePerguntaAtual = 0;
  renderizarPerguntaPerfil();
}

function renderizarPerguntaPerfil() {
  const container = document.getElementById('profileQuestionnaire');
  const totalPerguntas = perguntasPerfil.length;
  const perguntaAtual = perguntasPerfil[indicePerguntaAtual];
  const respostaSelecionada = respostasPerfil[perguntaAtual.id];
  const progresso = Math.round(((indicePerguntaAtual + 1) / totalPerguntas) * 100);
  const etapas = perguntasPerfil.map((_, index) => `<span class="perfil-etapa ${index <= indicePerguntaAtual ? 'ativa' : ''}"></span>`).join('');
  const valorCampo = obterValorCampoPerfil(perguntaAtual, respostaSelecionada);
  const respostaValida = Boolean(valorCampo.trim());
  const campoResposta = perguntaAtual.opcoes
    ? `
      <div class="perfil-opcoes" role="radiogroup" aria-label="${perguntaAtual.pergunta}">
        ${perguntaAtual.opcoes.map((opcao) => `
          <button
            type="button"
            class="perfil-opcao ${respostaSelecionada === opcao ? 'selecionada' : ''}"
            data-resposta="${opcao}"
            aria-pressed="${respostaSelecionada === opcao ? 'true' : 'false'}"
          >
            <span class="perfil-opcao-marcador"></span>
            <span>${formatarOpcaoPerfil(opcao)}</span>
          </button>
        `).join('')}
      </div>
    `
    : `
      <label class="perfil-campo-resposta">
        <span>Escreva sua resposta.</span>
        <input
          id="perfilRespostaAtual"
          type="${perguntaAtual.tipo}"
          value="${valorCampo}"
          autocomplete="off"
          placeholder="${perguntaAtual.placeholder || 'Digite sua resposta'}"
          ${perguntaAtual.min !== undefined ? `min="${perguntaAtual.min}"` : ''}
          ${perguntaAtual.step ? `step="${perguntaAtual.step}"` : ''}
        />
      </label>
    `;

  container.innerHTML = `
    <div class="perfil-card-interno">
      <img class="perfil-logo" src="assets/logo.png" alt="FMP Invest" />
      <h3>Perfil do Investidor</h3>
      <p>Responda em menos de 2 minutos para receber uma sugestao de perfil e primeiros passos.</p>
      <div class="perfil-topo">
        <span>Pergunta ${indicePerguntaAtual + 1} de ${totalPerguntas}</span>
        <span>${progresso}%</span>
      </div>
      <div class="perfil-progress-shell">
        <div class="perfil-barra"><div class="perfil-barra-fill" style="width:${progresso}%"></div></div>
        <div class="perfil-etapas" aria-hidden="true">${etapas}</div>
      </div>
      <h4>${perguntaAtual.pergunta}</h4>
      ${campoResposta}
      <div class="perfil-acoes">
        <button type="button" class="secundario" id="btnVoltarPerfil" ${indicePerguntaAtual === 0 ? 'disabled' : ''}>Voltar</button>
        <button type="button" id="btnProximoPerfil" ${respostaValida ? '' : 'disabled'}>Proximo</button>
      </div>
    </div>
  `;

  const inputResposta = container.querySelector('#perfilRespostaAtual');
  if (inputResposta) {
    inputResposta.addEventListener('input', () => {
      selecionarRespostaPerfil(inputResposta.value, false);
    });
    inputResposta.focus();
  }
  container.querySelectorAll('.perfil-opcao').forEach((botao) => {
    botao.addEventListener('click', () => selecionarRespostaPerfil(botao.dataset.resposta));
  });
  container.querySelector('#btnVoltarPerfil').addEventListener('click', voltarPerguntaPerfil);
  container.querySelector('#btnProximoPerfil').addEventListener('click', avancarPerguntaPerfil);
}

function selecionarRespostaPerfil(resposta, renderizar = true) {
  const perguntaAtual = perguntasPerfil[indicePerguntaAtual];
  respostasPerfil[perguntaAtual.id] = String(resposta).trim();
  if (renderizar) renderizarPerguntaPerfil();
  else atualizarBotaoProximoPerfil();
}

function atualizarBotaoProximoPerfil() {
  const botao = document.getElementById('btnProximoPerfil');
  const input = document.getElementById('perfilRespostaAtual');
  if (botao && input) botao.disabled = !input.value.trim();
}

function avancarPerguntaPerfil() {
  const perguntaAtual = perguntasPerfil[indicePerguntaAtual];
  const respostaAtual = respostasPerfil[perguntaAtual.id];
  const respostaValida = Boolean(obterValorCampoPerfil(perguntaAtual, respostaAtual).trim());
  if (!respostaValida) return;

  if (indicePerguntaAtual < perguntasPerfil.length - 1) {
    indicePerguntaAtual += 1;
    renderizarPerguntaPerfil();
    return;
  }

  renderizarFimQuestionarioPerfil();
}

function voltarPerguntaPerfil() {
  if (indicePerguntaAtual === 0) return;
  indicePerguntaAtual -= 1;
  renderizarPerguntaPerfil();
}

function renderizarFimQuestionarioPerfil() {
  const container = document.getElementById('profileQuestionnaire');
  container.innerHTML = `
    <div class="perfil-card-interno">
      <img class="perfil-logo" src="assets/logo.png" alt="FMP Invest" />
      <h3>Questionario finalizado</h3>
      <p>Revise as respostas e gere seu resultado de perfil.</p>
      <ul class="perfil-resumo-lista">
        ${perguntasPerfil.map((pergunta) => {
          const resposta = respostasPerfil[pergunta.id];
          const respostaFormatada = Array.isArray(resposta) ? (resposta.length ? resposta.join(', ') : '-') : (resposta || '-');
          return `<li><strong>${pergunta.pergunta}</strong><span>${respostaFormatada}</span></li>`;
        }).join('')}
      </ul>
      <div class="perfil-acoes">
        <button type="button" class="secundario" id="btnVoltarResumoPerfil">Voltar</button>
        <button type="button" id="btnVerPerfil">Ver meu perfil</button>
      </div>
    </div>
  `;
  container.querySelector('#btnVoltarResumoPerfil').addEventListener('click', () => {
    indicePerguntaAtual = perguntasPerfil.length - 1;
    renderizarPerguntaPerfil();
  });
  container.querySelector('#btnVerPerfil').addEventListener('click', async () => {
    const botao = container.querySelector('#btnVerPerfil');
    botao.disabled = true;
    botao.textContent = 'Gerando...';
    try {
      const analise = await postData('/api/profile-analysis', montarPayloadPerfil());
      state.profileAnalysis = analise;
      state.perfilInvestidor = {
        ...analise,
        perfil: obterPerfilExibicao(analise.investorProfile),
      };
      window.perfilInvestidor = state.perfilInvestidor;
      salvarPerfilLocal();
      renderizarResultadoPerfil();
      abrirDashboard();
      dispararFogosDeArtificio();
      await atualizarDashboardCarteira();
    } catch (error) {
      botao.disabled = false;
      botao.textContent = 'Ver meu perfil';
      const existente = container.querySelector('.perfil-erro');
      if (existente) existente.remove();
      container.querySelector('.perfil-acoes').insertAdjacentHTML('beforebegin', `<p class="perfil-erro error">${error.message}</p>`);
    }
  });
}

function renderizarResultadoPerfil() {
  renderizarPerfil();
  atualizarResumoDashboard();
}

function iniciarDashboardTabs() {
  document.querySelectorAll('.tab-button').forEach((button) => {
    button.addEventListener('click', () => abrirAbaDashboard(button.dataset.tab));
  });
}

function abrirAbaDashboard(tab) {
  if (!document.querySelector(`.dashboard-panel[data-panel="${tab}"]`)) tab = 'overview';
  const botaoAtual = document.querySelector('.tab-button.active');
  const botaoProximo = document.querySelector(`.tab-button[data-tab="${tab}"]`);
  if (botaoAtual && botaoAtual !== botaoProximo) botaoAtual.classList.remove('active');
  if (botaoProximo) botaoProximo.classList.add('active');

  const painelAtual = document.querySelector('.dashboard-panel.active');
  const painelProximo = document.querySelector(`.dashboard-panel[data-panel="${tab}"]`);
  if (painelAtual && painelAtual !== painelProximo) painelAtual.classList.remove('active');
  if (painelProximo) painelProximo.classList.add('active');

  const main = document.querySelector('.dashboard-main');
  if (main) {
    main.classList.add('panel-switching');
    if (panelSwitchTimeoutId) clearTimeout(panelSwitchTimeoutId);
    panelSwitchTimeoutId = setTimeout(() => {
      main.classList.remove('panel-switching');
      panelSwitchTimeoutId = null;
    }, 140);
  }

  const titulo = document.querySelector('.dashboard-topbar h1');
  const breadcrumb = document.querySelector('.breadcrumb');
  const botaoAtivo = document.querySelector(`.tab-button[data-tab="${tab}"]`);
  if (titulo && botaoAtivo) titulo.textContent = botaoAtivo.textContent;
  if (breadcrumb && botaoAtivo) breadcrumb.textContent = `Dashboards / ${botaoAtivo.textContent}`;
  if (tab === 'graficos' || tab === 'overview') {
    if (chartsRenderFrameId) cancelAnimationFrame(chartsRenderFrameId);
    chartsRenderFrameId = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        renderizarGraficosCarteira();
      });
    });
  }
  localStorage.setItem(STORAGE_KEY_LAST_TAB, tab);
}

function abrirDashboard(tabInicial = null) {
  const onboarding = document.getElementById('onboarding');
  const dashboard = document.getElementById('dashboardApp');
  if (onboarding) onboarding.classList.add('dashboard-hidden');
  if (dashboard) dashboard.classList.remove('dashboard-hidden');
  abrirAbaDashboard(tabInicial || localStorage.getItem(STORAGE_KEY_LAST_TAB) || 'overview');
  atualizarResumoDashboard();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function atualizarResumoDashboard() {
  const perfilNome = document.getElementById('overviewProfileName');
  const perfilPontuacao = document.getElementById('overviewProfileScore');
  const totalInvestido = document.getElementById('overviewTotalInvested');
  const ativosCount = document.getElementById('overviewAssetsCount');
  const scoreCarteira = document.getElementById('overviewPortfolioScore');
  const metricas = state.portfolioMetrics;
  const acoes = document.getElementById('overviewActionList');

  if (perfilNome) perfilNome.textContent = state.perfilInvestidor?.perfil || '-';
  if (perfilPontuacao) perfilPontuacao.textContent = state.perfilInvestidor ? `Perfil de ${state.perfilInvestidor.userName}` : 'Questionario pendente';
  if (totalInvestido) totalInvestido.textContent = formatCurrency(metricas?.totalInvested || state.assets.reduce((soma, asset) => soma + Number(asset.value || 0), 0));
  if (ativosCount) ativosCount.textContent = String(metricas?.assetsCount || state.assets.length || 0);
  if (scoreCarteira) scoreCarteira.textContent = String(metricas?.score || 0);
  if (acoes) {
    const recomendacoes = gerarRecomendacoesAutomaticas(state.perfilInvestidor, state.assets, state.portfolioMetrics).slice(0, 4);
    acoes.innerHTML = recomendacoes.map((item) => `
      <article class="action-item ${item.tipo}">
        <strong>${item.titulo}</strong>
        <span>${item.descricao}</span>
      </article>
    `).join('');
  }
}

function iniciarFundoInterativo() {
  let lastEvent = null;
  const aplicarMouse = () => {
    if (!lastEvent) {
      mouseFrameId = null;
      return;
    }
    const x = (lastEvent.clientX / window.innerWidth) * 100;
    const y = (lastEvent.clientY / window.innerHeight) * 100;
    document.documentElement.style.setProperty('--mouse-x', `${x}%`);
    document.documentElement.style.setProperty('--mouse-y', `${y}%`);
    document.documentElement.style.setProperty('--wave-x', ((x - 50) / 8).toFixed(2));
    document.documentElement.style.setProperty('--wave-y', ((y - 50) / 10).toFixed(2));
    mouseFrameId = null;
  };

  const atualizarMouse = (event) => {
    lastEvent = event;
    if (mouseFrameId) return;
    mouseFrameId = requestAnimationFrame(aplicarMouse);
  };

  window.addEventListener('mousemove', atualizarMouse);
}

function obterCanvasFogos() {
  if (!fireworksCanvas) {
    fireworksCanvas = document.createElement('canvas');
    fireworksCanvas.className = 'fireworks-canvas';
    document.body.appendChild(fireworksCanvas);
    fireworksContext = fireworksCanvas.getContext('2d');
  }

  fireworksCanvas.width = window.innerWidth;
  fireworksCanvas.height = window.innerHeight;
  return fireworksCanvas;
}

function dispararFogosDeArtificio() {
  const canvas = obterCanvasFogos();
  const ctx = fireworksContext;
  const cores = ['#ffe8a3', '#d6a93f', '#ffffff', '#b88623'];
  const particulas = [];
  const centroX = canvas.width / 2;
  const topo = canvas.height * 0.32;

  for (let explosao = 0; explosao < 6; explosao += 1) {
    const origemX = centroX + (Math.random() - 0.5) * Math.min(canvas.width * 0.7, 760);
    const origemY = topo + (Math.random() - 0.5) * Math.min(canvas.height * 0.28, 220);
    for (let i = 0; i < 46; i += 1) {
      const angulo = (Math.PI * 2 * i) / 46;
      const velocidade = 1.8 + Math.random() * 4.2;
      particulas.push({
        x: origemX,
        y: origemY,
        vx: Math.cos(angulo) * velocidade,
        vy: Math.sin(angulo) * velocidade,
        vida: 72 + Math.random() * 28,
        cor: cores[Math.floor(Math.random() * cores.length)],
        tamanho: 1.4 + Math.random() * 2.6,
      });
    }
  }

  if (fireworksAnimation) cancelAnimationFrame(fireworksAnimation);

  const animar = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = 'lighter';

    for (let i = particulas.length - 1; i >= 0; i -= 1) {
      const p = particulas[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.045;
      p.vx *= 0.985;
      p.vy *= 0.985;
      p.vida -= 1;

      const alpha = Math.max(p.vida / 90, 0);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.cor;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.tamanho, 0, Math.PI * 2);
      ctx.fill();

      if (p.vida <= 0) particulas.splice(i, 1);
    }

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';

    if (particulas.length) {
      fireworksAnimation = requestAnimationFrame(animar);
      return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  animar();
}

function obterDescricaoCategoria(categoria) {
  const descricoes = {
    acoes: 'Ativos de renda variavel ligados a empresas. Podem oscilar bastante e exigem diversificacao.',
    'renda fixa': 'Investimentos com regras de rentabilidade mais previsiveis, geralmente usados para seguranca e reserva.',
    cripto: 'Ativos digitais de alta volatilidade. No sistema, sao tratados como alto risco.',
    'fundos imobiliarios': 'Fundos negociados em bolsa que investem no setor imobiliario e podem gerar renda recorrente.',
  };
  return descricoes[categoria] || '';
}

function renderizarCamposAtivoPorCategoria(categoria) {
  const container = document.getElementById('assetDynamicFields');
  const description = document.getElementById('assetCategoryDescription');

  if (!categoria) {
    description.innerHTML = '';
    container.innerHTML = '';
    container.classList.remove('active');
    return;
  }

  description.innerHTML = `<p>${obterDescricaoCategoria(categoria)}</p>`;
  container.classList.add('active');

  if (categoria === 'acoes') {
    renderizarCamposAcoes(container);
    transformarSelectsParaCustom(container);
    return;
  }

  if (categoria === 'renda fixa') {
    renderizarCamposRendaFixa(container);
    transformarSelectsParaCustom(container);
    return;
  }

  if (categoria === 'cripto') {
    renderizarCamposCripto(container);
    transformarSelectsParaCustom(container);
    return;
  }

  if (categoria === 'fundos imobiliarios') {
    renderizarCamposFiis(container);
    transformarSelectsParaCustom(container);
  }
}

function fecharCustomSelectAberto() {
  if (!openCustomSelect) return;
  openCustomSelect.classList.remove('open');
  openCustomSelect = null;
}

function transformarSelectsParaCustom(root = document) {
  const selects = root.querySelectorAll('select:not([data-customized="true"])');
  selects.forEach((select) => {
    if (select.id === 'assetCategory') return;

    select.dataset.customized = 'true';
    select.classList.add('native-select-hidden');

    const wrapper = document.createElement('div');
    wrapper.className = 'custom-select';
    select.parentNode.insertBefore(wrapper, select);
    wrapper.appendChild(select);

    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'custom-select-trigger';
    wrapper.appendChild(trigger);

    const menu = document.createElement('div');
    menu.className = 'custom-select-menu';
    wrapper.appendChild(menu);

    const construirOpcoes = () => {
      menu.innerHTML = '';
      const options = Array.from(select.options);
      const selected = options.find((opt) => opt.value === select.value) || options[0];
      trigger.textContent = selected ? selected.textContent : 'Selecione';
      trigger.classList.toggle('placeholder', !select.value);

      options.forEach((option) => {
        const item = document.createElement('button');
        item.type = 'button';
        item.className = 'custom-select-option';
        if (option.value === select.value) item.classList.add('selected');
        item.textContent = option.textContent || '';
        item.disabled = option.disabled;
        item.addEventListener('click', () => {
          if (option.disabled) return;
          select.value = option.value;
          select.dispatchEvent(new Event('change', { bubbles: true }));
          select.dispatchEvent(new Event('input', { bubbles: true }));
          wrapper.classList.remove('open');
          openCustomSelect = null;
          construirOpcoes();
        });
        menu.appendChild(item);
      });
    };

    trigger.addEventListener('click', () => {
      const jaAberto = wrapper.classList.contains('open');
      fecharCustomSelectAberto();
      if (jaAberto) return;
      wrapper.classList.add('open');
      openCustomSelect = wrapper;
    });

    select.addEventListener('change', construirOpcoes);
    construirOpcoes();
  });
}

function renderizarCamposFiis(container) {
  const hoje = new Date().toISOString().split('T')[0];
  container.innerHTML = `
    <div class="asset-entry-shell asset-entry-fiis">
      <div class="asset-entry-header">
        <div><span class="section-kicker">Fundos imobiliarios</span><strong>Dados do fundo</strong></div>
        <span class="asset-entry-chip">Renda recorrente</span>
      </div>
      <div class="asset-entry-section">
        <div class="asset-entry-section-title"><strong>Identificacao</strong><span>Selecione o fundo e classifique seu segmento.</span></div>
        <label>Tipo de operacao<select id="assetOperation" required><option value="compra">Compra</option><option value="venda" disabled>Venda (em breve)</option></select></label>
        <label>Tipo de ativo<select id="assetFiiAssetType" required><option value="fundos imobiliarios">Fundos Imobiliarios</option></select></label>
        <label>Fundo imobiliario<select id="assetFiiTicker" required><option value="">Selecione</option><option value="MXRF11">MXRF11</option><option value="HGLG11">HGLG11</option><option value="KNRI11">KNRI11</option><option value="XPML11">XPML11</option><option value="VISC11">VISC11</option><option value="BCFF11">BCFF11</option><option value="XPLG11">XPLG11</option><option value="HGRU11">HGRU11</option><option value="KNSC11">KNSC11</option><option value="Outra">Outra</option></select></label>
        <label id="assetFiiCustomNameWrapper" style="display:none;">Nome do fundo<input id="assetFiiCustomName" type="text" placeholder="Digite o nome do fundo" /></label>
        <label>Tipo de FII<select id="assetFiiType" required><option value="">Selecione</option><option value="papel">Papel</option><option value="tijolo">Tijolo</option><option value="hibrido">Hibrido</option><option value="fundo de fundos">Fundo de fundos</option><option value="desenvolvimento">Desenvolvimento</option><option value="outro">Outro</option></select></label>
        <label>Segmento<select id="assetSegment" required><option value="">Selecione</option><option value="recebiveis">Recebiveis</option><option value="logistica">Logistica</option><option value="shopping">Shopping</option><option value="lajes corporativas">Lajes corporativas</option><option value="galpoes">Galpoes</option><option value="renda urbana">Renda urbana</option><option value="hibrido">Hibrido</option><option value="fundo de fundos">Fundo de fundos</option><option value="outros">Outros</option></select></label>
      </div>
      <div class="asset-entry-section">
        <div class="asset-entry-section-title"><strong>Compra e renda</strong><span>Preencha quantidade, preco medio e renda estimada.</span></div>
        <label>Data da compra<input id="assetPurchaseDate" type="date" value="${hoje}" required /></label>
        <label>Quantidade de cotas<input id="assetQuantity" type="number" min="1" step="1" required /></label>
        <label>Preco por cota<input id="assetUnitPrice" type="number" min="0.01" step="0.01" required /></label>
        <label>Outros custos<input id="assetOtherCosts" type="number" min="0" step="0.01" value="0" /></label>
        <label>Dividend yield mensal<input id="assetDyMonthly" type="text" placeholder="Ex: 0,8" /></label>
        <label>Objetivo do ativo<select id="assetObjective" required><option value="">Selecione</option><option value="renda mensal">Renda mensal</option><option value="diversificacao">Diversificacao</option><option value="longo prazo">Longo prazo</option><option value="especulacao">Especulacao</option></select></label>
      </div>
      <div class="asset-entry-summary">
        <label>Valor total<input id="assetTotalValueDisplay" type="text" value="${formatCurrency(0)}" disabled /><input id="assetValue" type="hidden" value="0" /></label>
        <label>Nivel de risco<input id="assetRiskDisplay" type="text" value="Medio" disabled /><input id="assetRisk" type="hidden" value="medio" /></label>
        <div class="asset-summary-note"><strong>Liquidez</strong><span>FIIs costumam ter negociacao em bolsa.</span></div>
      </div>
    </div>
  `;

  const tickerEl = container.querySelector('#assetFiiTicker');
  const customWrap = container.querySelector('#assetFiiCustomNameWrapper');
  const typeEl = container.querySelector('#assetFiiType');
  const segmentEl = container.querySelector('#assetSegment');
  const objectiveEl = container.querySelector('#assetObjective');
  const riskDisplay = container.querySelector('#assetRiskDisplay');
  const riskHidden = container.querySelector('#assetRisk');
  const qtyEl = container.querySelector('#assetQuantity');
  const priceEl = container.querySelector('#assetUnitPrice');
  const costsEl = container.querySelector('#assetOtherCosts');

  const atualizarRisco = () => {
    const risco = definirRiscoFii(objectiveEl.value, typeEl.value);
    riskHidden.value = risco;
    riskDisplay.value = risco === 'alto' ? 'Alto' : 'Medio';
  };

  tickerEl.addEventListener('change', () => {
    customWrap.style.display = tickerEl.value === 'Outra' ? 'grid' : 'none';
    const tipo = sugerirTipoFiiPorAtivo(tickerEl.value);
    const segmento = sugerirSegmentoFiiPorAtivo(tickerEl.value);
    if (tipo) typeEl.value = tipo;
    if (segmento) segmentEl.value = segmento;
    atualizarRisco();
  });

  [qtyEl, priceEl, costsEl].forEach((el) => el.addEventListener('input', calcularValorTotalFiis));
  objectiveEl.addEventListener('change', atualizarRisco);
  typeEl.addEventListener('change', atualizarRisco);
}

function calcularValorTotalFiis() {
  const parseNumero = (id) => {
    const raw = String(document.getElementById(id)?.value || '').trim().replace(',', '.');
    if (raw === '') return 0;
    const n = Number(raw);
    return Number.isFinite(n) ? n : 0;
  };
  const quantidade = parseNumero('assetQuantity');
  const preco = parseNumero('assetUnitPrice');
  const custos = parseNumero('assetOtherCosts');
  const total = (quantidade * preco) + custos;
  const totalDisplay = document.getElementById('assetTotalValueDisplay');
  const totalHidden = document.getElementById('assetValue');
  if (totalDisplay) totalDisplay.value = formatCurrency(Number.isFinite(total) ? total : 0);
  if (totalHidden) totalHidden.value = String(Number.isFinite(total) ? total : 0);
  return Number.isFinite(total) ? total : 0;
}

function sugerirTipoFiiPorAtivo(ativo) {
  const mapa = { MXRF11: 'papel', KNSC11: 'papel', HGLG11: 'tijolo', KNRI11: 'tijolo', XPML11: 'tijolo', VISC11: 'tijolo', XPLG11: 'tijolo', HGRU11: 'tijolo', BCFF11: 'fundo de fundos' };
  return mapa[ativo] || '';
}

function sugerirSegmentoFiiPorAtivo(ativo) {
  const mapa = { MXRF11: 'recebiveis', KNSC11: 'recebiveis', HGLG11: 'logistica', XPLG11: 'galpoes', XPML11: 'shopping', VISC11: 'shopping', KNRI11: 'hibrido', HGRU11: 'renda urbana', BCFF11: 'fundo de fundos' };
  return mapa[ativo] || '';
}

function definirRiscoFii(objetivo, tipoFii) {
  if (objetivo === 'especulacao' || tipoFii === 'desenvolvimento') return 'alto';
  return 'medio';
}

function validarFiis(dados) {
  const preco = Number(dados.unitPrice ?? dados.precoUnitario);
  const custos = Number(dados.otherCosts ?? dados.outrosCustos ?? 0);
  const quantidade = Number(dados.quantity ?? dados.quantidadeCotas);
  const dy = dados.dyMonthly === null || dados.dyMonthly === undefined || dados.dyMonthly === '' ? null : Number(dados.dyMonthly);

  if (dados.operation !== 'compra') return 'Apenas operacao de compra esta disponivel para FIIs.';
  if (!dados.fiiTicker) return 'Fundo imobiliario e obrigatorio.';
  if (dados.fiiTicker === 'Outra' && !dados.fiiCustomName) return 'Informe o nome do fundo.';
  if (!dados.purchaseDate) return 'Data da compra e obrigatoria.';
  if (!(quantidade > 0)) return 'Quantidade de cotas deve ser maior que zero.';
  if (!(preco > 0)) return 'Valor invalido para preco em R$.';
  if (custos < 0) return 'Outros custos nao podem ser negativos.';
  if (!dados.fiiType) return 'Tipo de FII e obrigatorio.';
  if (!dados.segment) return 'Segmento e obrigatorio.';
  if (!dados.objective) return 'Objetivo do ativo e obrigatorio.';
  if (dy !== null && dy < 0) return 'Dividend yield mensal nao pode ser negativo.';
  return null;
}

function montarAtivoFiis(base, getValue, getNumber) {
  const parseNumero = (id, fallback = 0) => {
    const raw = String(document.getElementById(id)?.value || '').trim().replace(',', '.');
    if (raw === '') return fallback;
    const n = Number(raw);
    return Number.isFinite(n) ? n : fallback;
  };
  const fiiTicker = getValue('assetFiiTicker');
  const fiiCustomName = getValue('assetFiiCustomName');
  const nomeFinal = fiiTicker === 'Outra' ? fiiCustomName : fiiTicker;
  const quantity = Math.floor(parseNumero('assetQuantity', 0));
  const unitPrice = parseNumero('assetUnitPrice', 0);
  const otherCosts = parseNumero('assetOtherCosts', 0);
  const total = calcularValorTotalFiis();
  const purchaseDate = getValue('assetPurchaseDate');
  const objective = getValue('assetObjective');
  const fiiType = getValue('assetFiiType');
  const segment = getValue('assetSegment');
  const dyRaw = getValue('assetDyMonthly').replace(',', '.');
  const dyMonthly = dyRaw === '' ? null : Number(dyRaw);
  const risk = definirRiscoFii(objective, fiiType);

  return {
    ...base,
    category: 'fundos imobiliarios',
    type: 'fundo imobiliario',
    categoria: 'Fundos Imobiliarios',
    operacao: getValue('assetOperation') || 'compra',
    operation: getValue('assetOperation') || 'compra',
    tipoAtivo: 'Fundos Imobiliarios',
    name: nomeFinal,
    nome: nomeFinal,
    fiiTicker,
    fiiCustomName,
    value: total,
    valorInvestido: total,
    quantity,
    unitPrice,
    quantidadeCotas: quantity,
    averagePrice: unitPrice,
    precoUnitario: unitPrice,
    otherCosts,
    outrosCustos: otherCosts,
    purchaseDate,
    dataCompra: purchaseDate,
    objective,
    fiiType,
    tipoFii: fiiType,
    segment,
    segmento: segment,
    dyMonthly,
    dividendYieldMensal: dyMonthly,
    risk,
    risco: risk,
    liquidity: 'diaria',
    liquidez: 'diaria',
    detalhes: {
      ativo: nomeFinal,
      tipoFii: fiiType,
      segmento: segment,
      quantidadeCotas: quantity,
      precoUnitario: unitPrice,
      outrosCustos: otherCosts,
      dividendYieldMensal: dyMonthly,
      dataCompra: purchaseDate,
    },
  };
}

function formatarDetalhesFiis(ativo) {
  const compra = ativo.purchaseDate ? new Date(`${ativo.purchaseDate}T00:00:00`).toLocaleDateString('pt-BR') : '-';
  const custos = Number(ativo.outrosCustos || ativo.otherCosts || 0);
  const dy = ativo.dyMonthly === null || ativo.dyMonthly === undefined ? '-' : `${Number(ativo.dyMonthly).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
  return `Tipo: ${ativo.fiiType}<br>Segmento: ${ativo.segment}<br>Cotas: ${ativo.quantity}<br>Preco unitario: ${formatCurrency(ativo.precoUnitario || ativo.averagePrice)}<br>DY mensal: ${dy}<br>Outros custos: ${formatCurrency(custos)}<br>Compra: ${compra}`;
}

function renderizarCamposRendaFixa(container) {
  const hoje = new Date().toISOString().split('T')[0];
  container.innerHTML = `
    <div class="fixed-income-shell">
      <div class="fixed-income-header">
        <div>
          <span class="section-kicker">Renda fixa</span>
          <strong>Detalhes do titulo</strong>
        </div>
        <span class="fixed-income-chip">Baixa volatilidade</span>
      </div>

      <div class="fixed-income-section">
        <div class="fixed-income-section-title">
          <strong>Identificacao</strong>
          <span>Informe como o ativo aparece na corretora.</span>
        </div>
        <label>Tipo de operacao
          <select id="assetOperation" required>
            <option value="compra">Compra</option>
            <option value="venda" disabled>Venda (em breve)</option>
          </select>
        </label>
        <label>Tipo de ativo
          <select id="assetFixedIncomeType" required>
            <option value="">Selecione</option><option value="tesouro direto">Tesouro Direto</option><option value="cdb">CDB</option><option value="lci">LCI</option><option value="lca">LCA</option><option value="lc">LC</option><option value="lf">LF</option><option value="rdb">RDB</option><option value="debenture">Debenture</option><option value="cri">CRI</option><option value="cra">CRA</option><option value="outro">Outro</option>
          </select>
        </label>
        <label>Emissor
          <input id="assetIssuer" type="text" placeholder="Banco, tesouro ou instituicao" required />
        </label>
        <label>Nome do titulo
          <input id="assetName" type="text" placeholder="Ex: CDB 110% CDI" required />
        </label>
      </div>

      <div class="fixed-income-section">
        <div class="fixed-income-section-title">
          <strong>Rentabilidade</strong>
          <span>Defina indexador, forma e taxa contratada.</span>
        </div>
        <label>Indexador
          <select id="assetIndexer" required>
            <option value="">Selecione</option><option value="cdi">CDI</option><option value="cdi+">CDI+</option><option value="ipca+">IPCA+</option><option value="prefixado">Prefixado</option><option value="selic">Selic</option><option value="outro">Outro</option>
          </select>
        </label>
        <label>Forma
          <select id="assetForm" required>
            <option value="">Selecione</option><option value="pos-fixado">Pos-fixado</option><option value="prefixado">Prefixado</option><option value="hibrido">Hibrido</option>
          </select>
        </label>
        <div id="assetYieldDynamicFields" class="dynamic-fields fixed-income-yield-fields"></div>
      </div>

      <div class="fixed-income-section">
        <div class="fixed-income-section-title">
          <strong>Valores e prazo</strong>
          <span>Esses campos alimentam o resumo da carteira.</span>
        </div>
        <label>Valor investido
          <input id="assetValue" type="number" min="0.01" step="0.01" placeholder="R$ 0,00" required />
        </label>
        <label>Data da compra
          <input id="assetPurchaseDate" type="date" value="${hoje}" required />
        </label>
        <label id="assetMaturityWrapper">Data de vencimento
          <input id="assetMaturity" type="date" required />
          <small class="field-help">Obrigatoria quando nao houver liquidez diaria.</small>
        </label>
        <label class="premium-toggle fixed-income-toggle">
          <input id="assetDailyLiquidity" type="checkbox" />
          <span class="toggle-control" aria-hidden="true"></span>
          <span>
            <strong>Liquidez diaria</strong>
            <small>Permite resgate antes do vencimento.</small>
          </span>
        </label>
      </div>

      <div class="fixed-income-summary">
        <label>Garantia FGC
          <select id="assetFGC" required>
            <option value="">Selecione</option><option value="sim">Sim</option><option value="nao">Nao</option><option value="nao se aplica">Nao se aplica</option>
          </select>
        </label>
        <label>Nivel de risco
          <input id="assetRiskDisplay" type="text" disabled />
          <input id="assetRisk" type="hidden" />
        </label>
        <label>Valor total
          <input id="assetTotalValueDisplay" type="text" value="${formatCurrency(0)}" disabled />
        </label>
      </div>
    </div>
  `;

  const typeEl = container.querySelector('#assetFixedIncomeType');
  const indexerEl = container.querySelector('#assetIndexer');
  const formEl = container.querySelector('#assetForm');
  const fgcEl = container.querySelector('#assetFGC');
  const riskEl = container.querySelector('#assetRisk');
  const riskDisplayEl = container.querySelector('#assetRiskDisplay');
  const issuerEl = container.querySelector('#assetIssuer');
  const dailyLiqEl = container.querySelector('#assetDailyLiquidity');
  const maturityEl = container.querySelector('#assetMaturity');
  const maturityWrapperEl = container.querySelector('#assetMaturityWrapper');
  const valueEl = container.querySelector('#assetValue');
  const totalDisplayEl = container.querySelector('#assetTotalValueDisplay');

  const atualizarRisco = () => {
    const risco = calcularRiscoRendaFixa(typeEl.value, fgcEl.value);
    riskEl.value = risco;
    riskDisplayEl.value = risco === 'baixo' ? 'Baixo' : 'Medio';
  };

  const atualizarEmissor = () => {
    if (typeEl.value === 'tesouro direto') {
      issuerEl.value = 'Tesouro Nacional';
      issuerEl.readOnly = true;
    } else {
      if (issuerEl.value === 'Tesouro Nacional') issuerEl.value = '';
      issuerEl.readOnly = false;
    }
  };

  const atualizarLiquidez = () => {
    maturityEl.required = !dailyLiqEl.checked;
    maturityEl.disabled = dailyLiqEl.checked;
    maturityWrapperEl.classList.toggle('field-muted', dailyLiqEl.checked);
    if (dailyLiqEl.checked) maturityEl.value = '';
  };

  typeEl.addEventListener('change', () => {
    fgcEl.value = sugerirFgcPorTipoAtivo(typeEl.value);
    atualizarEmissor();
    atualizarRisco();
  });

  indexerEl.addEventListener('change', () => {
    atualizarCamposPorIndexador(indexerEl.value);
    formEl.value = sugerirFormaPorIndexador(indexerEl.value);
  });

  fgcEl.addEventListener('change', atualizarRisco);
  dailyLiqEl.addEventListener('change', atualizarLiquidez);
  valueEl.addEventListener('input', () => {
    totalDisplayEl.value = formatCurrency(Number(valueEl.value || 0));
  });

  atualizarCamposPorIndexador('');
  fgcEl.value = 'sim';
  atualizarRisco();
  atualizarLiquidez();
}

function renderizarCamposAcoes(container) {
  const hoje = new Date().toISOString().split('T')[0];
  container.innerHTML = `
    <div class="asset-entry-shell asset-entry-stocks">
      <div class="asset-entry-header">
        <div><span class="section-kicker">Acoes</span><strong>Dados da empresa</strong></div>
        <span class="asset-entry-chip">Bolsa de valores</span>
      </div>
      <div class="asset-entry-section">
        <div class="asset-entry-section-title"><strong>Identificacao</strong><span>Selecione o ticker, setor e objetivo da posicao.</span></div>
        <label>Tipo de operacao<select id="assetOperation" required><option value="compra">Compra</option><option value="venda" disabled>Venda (em breve)</option></select></label>
        <label>Tipo de ativo<select id="assetStockType" required><option value="acoes">Acoes</option></select></label>
        <label>Ativo<select id="assetTicker" required><option value="">Selecione</option><option value="PETR4">PETR4</option><option value="VALE3">VALE3</option><option value="ITUB4">ITUB4</option><option value="BBAS3">BBAS3</option><option value="WEGE3">WEGE3</option><option value="BBDC4">BBDC4</option><option value="ABEV3">ABEV3</option><option value="MGLU3">MGLU3</option><option value="Outra">Outra</option></select></label>
        <label id="assetStockCustomNameWrapper" style="display:none;">Nome da acao / empresa<input id="assetStockCustomName" type="text" placeholder="Digite o nome da acao ou empresa" /></label>
        <label>Setor<select id="assetSector" required><option value="">Selecione</option><option value="bancos">Bancos</option><option value="energia">Energia</option><option value="commodities">Commodities</option><option value="consumo">Consumo</option><option value="tecnologia">Tecnologia</option><option value="varejo">Varejo</option><option value="saude">Saude</option><option value="industrial">Industrial</option><option value="outros">Outros</option></select></label>
        <label>Objetivo do ativo<select id="assetObjective" required><option value="">Selecione</option><option value="dividendos">Dividendos</option><option value="crescimento">Crescimento</option><option value="longo prazo">Longo prazo</option><option value="especulacao">Especulacao</option></select></label>
      </div>
      <div class="asset-entry-section">
        <div class="asset-entry-section-title"><strong>Compra</strong><span>Preencha quantidade, preco medio e custos.</span></div>
        <label>Data da compra<input id="assetPurchaseDate" type="date" value="${hoje}" required /></label>
        <label>Quantidade<input id="assetQuantity" type="number" min="1" step="1" required /></label>
        <label>Preco por acao<input id="assetUnitPrice" type="number" min="0.01" step="0.01" required /></label>
        <label>Outros custos<input id="assetOtherCosts" type="number" min="0" step="0.01" value="0" /></label>
      </div>
      <div class="asset-entry-summary">
        <label>Valor total<input id="assetTotalValueDisplay" type="text" value="${formatCurrency(0)}" disabled /><input id="assetValue" type="hidden" value="0" /></label>
        <label>Nivel de risco<input id="assetRiskDisplay" type="text" value="Medio" disabled /><input id="assetRisk" type="hidden" value="medio" /></label>
        <div class="asset-summary-note"><strong>Liquidez</strong><span>Ativo negociado em mercado secundario.</span></div>
      </div>
    </div>
  `;

  const tickerEl = container.querySelector('#assetTicker');
  const customWrap = container.querySelector('#assetStockCustomNameWrapper');
  const sectorEl = container.querySelector('#assetSector');
  const objectiveEl = container.querySelector('#assetObjective');
  const riskDisplay = container.querySelector('#assetRiskDisplay');
  const riskHidden = container.querySelector('#assetRisk');
  const qtyEl = container.querySelector('#assetQuantity');
  const priceEl = container.querySelector('#assetUnitPrice');
  const costsEl = container.querySelector('#assetOtherCosts');

  tickerEl.addEventListener('change', () => {
    customWrap.style.display = tickerEl.value === 'Outra' ? 'grid' : 'none';
    const setorSugerido = sugerirSetorPorTicker(tickerEl.value);
    if (setorSugerido) sectorEl.value = setorSugerido;
  });

  objectiveEl.addEventListener('change', () => {
    const risco = definirRiscoAcao(objectiveEl.value);
    riskHidden.value = risco;
    riskDisplay.value = risco === 'alto' ? 'Alto' : 'Medio';
  });

  [qtyEl, priceEl, costsEl].forEach((el) => el.addEventListener('input', calcularValorTotalAcoes));
}

function calcularValorTotalAcoes() {
  const quantidade = Number(document.getElementById('assetQuantity')?.value || 0);
  const preco = Number(document.getElementById('assetUnitPrice')?.value || 0);
  const custos = Number(document.getElementById('assetOtherCosts')?.value || 0);
  const total = (quantidade * preco) + custos;
  const totalDisplay = document.getElementById('assetTotalValueDisplay');
  const totalHidden = document.getElementById('assetValue');
  if (totalDisplay) totalDisplay.value = formatCurrency(Number.isFinite(total) ? total : 0);
  if (totalHidden) totalHidden.value = String(Number.isFinite(total) ? total : 0);
  return Number.isFinite(total) ? total : 0;
}

function sugerirSetorPorTicker(ativo) {
  const mapa = { PETR4: 'energia', VALE3: 'commodities', ITUB4: 'bancos', BBAS3: 'bancos', WEGE3: 'industrial', BBDC4: 'bancos', ABEV3: 'consumo', MGLU3: 'varejo' };
  return mapa[ativo] || '';
}

function definirRiscoAcao(objetivo) {
  return objetivo === 'especulacao' ? 'alto' : 'medio';
}

function validarAcoes(dados) {
  if (dados.operation !== 'compra') return 'Apenas operacao de compra esta disponivel para acoes.';
  if (!dados.stockTicker) return 'Ativo de acao e obrigatorio.';
  if (dados.stockTicker === 'Outra' && !dados.stockCustomName) return 'Informe o nome da acao / empresa.';
  if (!dados.purchaseDate) return 'Data da compra e obrigatoria.';
  if (!(dados.quantity > 0)) return 'Quantidade deve ser maior que zero.';
  if (!(dados.unitPrice > 0)) return 'Valor invalido para preco em R$.';
  if (dados.otherCosts < 0) return 'Outros custos nao podem ser negativos.';
  if (!(dados.value > 0)) return 'Valor total deve ser maior que zero.';
  if (!dados.objective) return 'Objetivo do ativo e obrigatorio.';
  if (!dados.sector) return 'Setor e obrigatorio.';
  return null;
}

function montarAtivoAcoes(base, getValue, getNumber) {
  const stockTicker = getValue('assetTicker');
  const stockCustomName = getValue('assetStockCustomName');
  const nomeFinal = stockTicker === 'Outra' ? stockCustomName : stockTicker;
  const quantity = Math.floor(getNumber('assetQuantity'));
  const unitPrice = getNumber('assetUnitPrice');
  const otherCosts = Number(document.getElementById('assetOtherCosts')?.value || 0);
  const total = calcularValorTotalAcoes();
  const purchaseDate = getValue('assetPurchaseDate');
  const objective = getValue('assetObjective');
  const sector = getValue('assetSector');
  const risk = definirRiscoAcao(objective);

  return {
    ...base,
    category: 'acoes',
    type: 'acao',
    categoria: 'Acoes',
    operacao: getValue('assetOperation') || 'compra',
    operation: getValue('assetOperation') || 'compra',
    tipoAtivo: 'Acoes',
    name: nomeFinal,
    nome: nomeFinal,
    stockTicker,
    stockCustomName,
    value: total,
    valorInvestido: total,
    quantity,
    unitPrice,
    averagePrice: unitPrice,
    precoUnitario: unitPrice,
    otherCosts,
    outrosCustos: otherCosts,
    purchaseDate,
    dataCompra: purchaseDate,
    objective,
    setor: sector,
    sector,
    risk,
    risco: risk,
    liquidity: 'diaria',
    liquidez: 'diaria',
    detalhes: {
      ativo: nomeFinal,
      quantidade: quantity,
      precoUnitario: unitPrice,
      outrosCustos: otherCosts,
      dataCompra: purchaseDate,
      setor: sector,
    },
  };
}

function formatarDetalhesAcoes(ativo) {
  const compra = ativo.purchaseDate ? new Date(`${ativo.purchaseDate}T00:00:00`).toLocaleDateString('pt-BR') : '-';
  const custos = Number(ativo.outrosCustos || 0);
  return `Setor: ${ativo.sector}<br>Quantidade: ${ativo.quantity}<br>Preco unitario: ${formatCurrency(ativo.precoUnitario || ativo.averagePrice)}<br>Outros custos: ${formatCurrency(custos)}<br>Compra: ${compra}`;
}

function atualizarCamposPorIndexador(indexador) {
  const container = document.getElementById('assetYieldDynamicFields');
  if (!container) return;

  const campos = {
    cdi: `<label>Percentual do CDI (%)<input id="assetCdiPercent" type="number" min="0.01" step="0.01" required /></label>`,
    'cdi+': `<label>Percentual do CDI (%)<input id="assetCdiPercent" type="number" min="0.01" step="0.01" required /></label><label>Taxa adicional ao ano (%)<input id="assetAdditionalRate" type="number" min="0" step="0.01" required /></label>`,
    'ipca+': `<label>Taxa acima do IPCA ao ano (%)<input id="assetIpcaRate" type="number" min="0" step="0.01" required /></label>`,
    prefixado: `<label>Taxa prefixada ao ano (%)<input id="assetPrefixedRate" type="number" min="0" step="0.01" required /></label>`,
    selic: `<label>Percentual da Selic (%)<input id="assetSelicPercent" type="number" min="0.01" step="0.01" required /></label>`,
    outro: `<label>Descricao da rentabilidade<input id="assetYieldDescription" type="text" placeholder="Ex: rentabilidade informada manualmente" required /></label>`,
  };
  container.innerHTML = campos[indexador] || '';
}

function sugerirFormaPorIndexador(indexador) {
  if (['cdi', 'cdi+', 'selic'].includes(indexador)) return 'pos-fixado';
  if (indexador === 'prefixado') return 'prefixado';
  if (indexador === 'ipca+') return 'hibrido';
  return '';
}

function sugerirFgcPorTipoAtivo(tipoAtivo) {
  if (['cdb', 'lci', 'lca', 'lc', 'rdb'].includes(tipoAtivo)) return 'sim';
  if (tipoAtivo === 'tesouro direto') return 'nao se aplica';
  return 'nao';
}

function calcularRiscoRendaFixa(tipoAtivo, garantiaFgc) {
  if (tipoAtivo === 'tesouro direto') return 'baixo';
  if (['lf', 'debenture', 'cri', 'cra', 'outro'].includes(tipoAtivo)) return 'medio';
  if (['cdb', 'lci', 'lca', 'lc', 'rdb'].includes(tipoAtivo) && garantiaFgc === 'sim') return 'baixo';
  return 'medio';
}

function formatarRentabilidadeRendaFixa(ativo) {
  const r = ativo.rentabilidade || {};
  if (ativo.indexador === 'cdi') return `${r.percentualCdi}% do CDI`;
  if (ativo.indexador === 'cdi+') return `${r.percentualCdi}% do CDI + ${r.taxaAdicional}% a.a.`;
  if (ativo.indexador === 'ipca+') return `IPCA + ${r.taxaIpca}% a.a.`;
  if (ativo.indexador === 'prefixado') return `${r.taxaPrefixada}% a.a.`;
  if (ativo.indexador === 'selic') return `${r.percentualSelic}% da Selic`;
  return r.descricao || 'Rentabilidade manual';
}

function validarRendaFixa(dados) {
  if (dados.operation !== 'compra') return 'Apenas operacao de compra esta disponivel no momento.';
  if (!dados.fixedIncomeType) return 'Tipo de ativo de renda fixa e obrigatorio.';
  if (!dados.name) return 'Nome do titulo e obrigatorio.';
  if (dados.fixedIncomeType !== 'tesouro direto' && !dados.issuer) return 'Emissor e obrigatorio para esse tipo de ativo.';
  if (!dados.indexer) return 'Indexador e obrigatorio.';
  if (!(dados.value > 0)) return 'Valor investido deve ser maior que zero.';
  if (!dados.purchaseDate) return 'Data da compra e obrigatoria.';
  if (!dados.liquidityDaily && !dados.maturityDate) return 'Data de vencimento e obrigatoria sem liquidez diaria.';
  if (dados.maturityDate && dados.purchaseDate && dados.maturityDate < dados.purchaseDate) return 'Data de vencimento nao pode ser anterior a data da compra.';
  if (!['baixo', 'medio'].includes(dados.risk)) return 'Renda fixa nao pode ter risco alto.';

  const taxas = dados.rentabilidade || {};
  const taxaValida = (v) => v === null || Number(v) >= 0;
  if (!taxaValida(taxas.taxaAdicional) || !taxaValida(taxas.taxaIpca) || !taxaValida(taxas.taxaPrefixada)) return 'Taxas de rentabilidade nao podem ser negativas.';

  if (dados.indexer === 'cdi' || dados.indexer === 'cdi+') {
    if (!(Number(taxas.percentualCdi) > 0)) return 'Percentual do CDI deve ser maior que zero.';
  }
  if (dados.indexer === 'cdi+' && taxas.taxaAdicional === null) return 'Taxa adicional ao ano e obrigatoria para CDI+.';
  if (dados.indexer === 'ipca+' && taxas.taxaIpca === null) return 'Taxa acima do IPCA e obrigatoria.';
  if (dados.indexer === 'prefixado' && taxas.taxaPrefixada === null) return 'Taxa prefixada ao ano e obrigatoria.';
  if (dados.indexer === 'selic' && !(Number(taxas.percentualSelic) > 0)) return 'Percentual da Selic deve ser maior que zero.';
  if (dados.indexer === 'outro' && !String(taxas.descricao || '').trim()) return 'Descricao da rentabilidade e obrigatoria.';
  return null;
}

function renderizarCamposCripto(container) {
  const hoje = new Date().toISOString().split('T')[0];
  container.innerHTML = `
    <div class="asset-entry-shell asset-entry-crypto">
      <div class="asset-entry-header">
        <div><span class="section-kicker">Cripto</span><strong>Dados do ativo digital</strong></div>
        <span class="asset-entry-chip danger">Alta volatilidade</span>
      </div>
      <div class="asset-entry-section">
        <div class="asset-entry-section-title"><strong>Identificacao</strong><span>Registre o ativo, objetivo e data da compra.</span></div>
        <label>Tipo de operacao<select id="assetOperation" required><option value="compra">Compra</option><option value="venda" disabled>Venda (em breve)</option></select></label>
        <label>Tipo de ativo<select id="assetCryptoType" required><option value="criptomoedas">Criptomoedas</option></select></label>
        <label>Ativo<select id="assetCryptoName" required><option value="">Selecione</option><option value="Bitcoin">Bitcoin</option><option value="Ethereum">Ethereum</option><option value="Solana">Solana</option><option value="BNB">BNB</option><option value="XRP">XRP</option><option value="Cardano">Cardano</option><option value="Dogecoin">Dogecoin</option><option value="Outra">Outra</option></select></label>
        <label id="assetCryptoCustomNameWrapper" style="display:none;">Nome da criptomoeda<input id="assetCryptoCustomName" type="text" placeholder="Digite o nome da criptomoeda" /></label>
        <label>Objetivo do ativo<select id="assetObjective" required><option value="">Selecione</option><option value="reserva de valor">Reserva de valor</option><option value="longo prazo">Longo prazo</option><option value="especulacao">Especulacao</option></select></label>
      </div>
      <div class="asset-entry-section">
        <div class="asset-entry-section-title"><strong>Compra</strong><span>Use o preco medio em reais e custos da operacao.</span></div>
        <label>Data da compra<input id="assetPurchaseDate" type="date" value="${hoje}" required /></label>
        <label>Quantidade<input id="assetQuantity" type="number" min="0.00000001" step="0.00000001" required /></label>
        <label>Preco em R$<input id="assetUnitPrice" type="number" min="0.01" step="0.01" required /></label>
        <label>Outros custos<input id="assetOtherCosts" type="number" min="0" step="0.01" value="0" /></label>
      </div>
      <div class="asset-entry-summary">
        <label>Valor total<input id="assetTotalValueDisplay" type="text" value="${formatCurrency(0)}" disabled /><input id="assetValue" type="hidden" value="0" /></label>
        <label>Nivel de risco<input id="assetRiskDisplay" type="text" value="Alto" disabled /><input id="assetRisk" type="hidden" value="alto" /></label>
        <div class="asset-summary-note danger"><strong>Atenção</strong><span>Categoria sensivel a volatilidade e concentracao.</span></div>
      </div>
    </div>
  `;

  const ativoEl = container.querySelector('#assetCryptoName');
  const customWrap = container.querySelector('#assetCryptoCustomNameWrapper');
  const qtyEl = container.querySelector('#assetQuantity');
  const priceEl = container.querySelector('#assetUnitPrice');
  const costsEl = container.querySelector('#assetOtherCosts');

  ativoEl.addEventListener('change', () => {
    customWrap.style.display = ativoEl.value === 'Outra' ? 'grid' : 'none';
  });

  [qtyEl, priceEl, costsEl].forEach((el) => {
    el.addEventListener('input', calcularValorTotalCripto);
  });
}

function calcularValorTotalCripto() {
  const quantidade = Number(document.getElementById('assetQuantity')?.value || 0);
  const precoUnitario = Number(document.getElementById('assetUnitPrice')?.value || 0);
  const outrosCustos = Number(document.getElementById('assetOtherCosts')?.value || 0);
  const total = (quantidade * precoUnitario) + outrosCustos;

  const totalDisplay = document.getElementById('assetTotalValueDisplay');
  const totalHidden = document.getElementById('assetValue');
  if (totalDisplay) totalDisplay.value = formatCurrency(Number.isFinite(total) ? total : 0);
  if (totalHidden) totalHidden.value = String(Number.isFinite(total) ? total : 0);
  return Number.isFinite(total) ? total : 0;
}

function validarCripto(dados) {
  if (dados.operation !== 'compra') return 'Apenas operacao de compra esta disponivel para criptomoedas.';
  if (!dados.cryptoAsset) return 'Selecione um ativo de criptomoeda.';
  if (dados.cryptoAsset === 'Outra' && !dados.cryptoCustomName) return 'Informe o nome da criptomoeda.';
  if (!dados.objective) return 'Objetivo do ativo e obrigatorio.';
  if (!dados.purchaseDate) return 'Data da compra e obrigatoria.';
  if (!(dados.quantity > 0)) return 'Quantidade deve ser maior que zero.';
  if (!(dados.unitPrice > 0)) return 'Valor invalido para preco em R$.';
  if (dados.otherCosts < 0) return 'Outros custos nao podem ser negativos.';
  if (!(dados.value > 0)) return 'Valor total deve ser maior que zero.';
  return null;
}

function montarAtivoCripto(base, getValue, getNumber) {
  const cryptoAsset = getValue('assetCryptoName');
  const cryptoCustomName = getValue('assetCryptoCustomName');
  const nomeFinal = cryptoAsset === 'Outra' ? cryptoCustomName : cryptoAsset;
  const quantity = getNumber('assetQuantity');
  const unitPrice = getNumber('assetUnitPrice');
  const otherCosts = Number(document.getElementById('assetOtherCosts')?.value || 0);
  const total = calcularValorTotalCripto();
  const purchaseDate = getValue('assetPurchaseDate');
  const objective = getValue('assetObjective');

  return {
    ...base,
    category: 'cripto',
    type: 'cripto',
    categoria: 'Cripto',
    operacao: getValue('assetOperation') || 'compra',
    operation: getValue('assetOperation') || 'compra',
    tipoAtivo: 'Criptomoedas',
    name: nomeFinal,
    nome: nomeFinal,
    cryptoAsset,
    cryptoCustomName,
    value: total,
    valorInvestido: total,
    quantity,
    averagePrice: unitPrice,
    precoUnitario: unitPrice,
    outrosCustos: otherCosts,
    purchaseDate,
    dataCompra: purchaseDate,
    objective,
    risk: 'alto',
    risco: 'alto',
    liquidity: 'diaria',
    liquidez: 'diaria',
    detalhes: {
      ativo: nomeFinal,
      quantidade: quantity,
      precoUnitario: unitPrice,
      outrosCustos: otherCosts,
      dataCompra: purchaseDate,
    },
  };
}

function formatarDetalhesCripto(ativo) {
  const compra = ativo.purchaseDate ? new Date(`${ativo.purchaseDate}T00:00:00`).toLocaleDateString('pt-BR') : '-';
  const custos = Number(ativo.outrosCustos || 0);
  return `Quantidade: ${ativo.quantity}<br>Preco unitario: ${formatCurrency(ativo.precoUnitario || ativo.averagePrice)}<br>Outros custos: ${formatCurrency(custos)}<br>Compra: ${compra}`;
}

function validarAtivoPorCategoria(categoria, dados) {
  if (!categoria) return 'Selecione uma categoria de ativo.';
  if (!dados.name) return 'Nome do ativo e obrigatorio.';
  if (!(dados.value > 0)) return 'Valor investido deve ser maior que zero.';

  if (categoria === 'acoes') {
    return validarAcoes(dados);
  }

  if (categoria === 'renda fixa') {
    return validarRendaFixa(dados);
  }

  if (categoria === 'cripto') {
    return validarCripto(dados);
  }

  if (categoria === 'fundos imobiliarios') {
    return validarFiis(dados);
  }

  return null;
}

function montarAtivoPorCategoria(categoria) {
  const getValue = (id) => document.getElementById(id)?.value?.trim() || '';
  const getNumber = (id) => Number(document.getElementById(id)?.value);
  const base = {
    id: Date.now(),
    categoria: categoria,
    nome: getValue('assetName'),
    valorInvestido: getNumber('assetValue'),
  };

  if (categoria === 'acoes') {
    return montarAtivoAcoes(base, getValue, getNumber);
  }

  if (categoria === 'renda fixa') {
    const parseNumberOrNull = (id) => {
      const raw = document.getElementById(id)?.value;
      if (raw === '' || raw === undefined) return null;
      return Number(raw);
    };
    const fixedIncomeType = getValue('assetFixedIncomeType');
    const indexer = getValue('assetIndexer');
    const operation = getValue('assetOperation') || 'compra';
    const issuer = getValue('assetIssuer') || (fixedIncomeType === 'tesouro direto' ? 'Tesouro Nacional' : '');
    const purchaseDate = getValue('assetPurchaseDate');
    const liquidityDaily = Boolean(document.getElementById('assetDailyLiquidity')?.checked);
    const maturity = getValue('assetMaturity');
    const fgc = getValue('assetFGC') || sugerirFgcPorTipoAtivo(fixedIncomeType);
    const risk = calcularRiscoRendaFixa(fixedIncomeType, fgc);
    const form = getValue('assetForm') || sugerirFormaPorIndexador(indexer);
    const rentabilidade = {
      percentualCdi: parseNumberOrNull('assetCdiPercent'),
      taxaAdicional: parseNumberOrNull('assetAdditionalRate'),
      taxaIpca: parseNumberOrNull('assetIpcaRate'),
      taxaPrefixada: parseNumberOrNull('assetPrefixedRate'),
      percentualSelic: parseNumberOrNull('assetSelicPercent'),
      descricao: getValue('assetYieldDescription'),
    };

    return {
      ...base,
      category: 'renda fixa',
      type: 'renda fixa',
      name: getValue('assetName'),
      operacao: operation,
      operation,
      tipoAtivo: fixedIncomeType,
      fixedIncomeType,
      emissor: issuer,
      issuer,
      titleType: fixedIncomeType,
      indexador: indexer,
      indexer,
      forma: form,
      form,
      value: getNumber('assetValue'),
      valorTotal: getNumber('assetValue'),
      dataCompra: purchaseDate,
      purchaseDate,
      liquidezDiaria: liquidityDaily,
      liquidityDaily,
      yieldInfo: formatarRentabilidadeRendaFixa({ indexador: indexer, rentabilidade }),
      rentabilidade,
      maturityDate: maturity || 'Sem vencimento',
      liquidity: liquidityDaily ? 'diaria' : 'no vencimento',
      fgc,
      risk,
      objective: 'reserva',
      risco: risk,
      objetivo: 'seguranca',
      liquidez: liquidityDaily ? 'diaria' : 'no vencimento',
      detalhes: {
        tipoTitulo: fixedIncomeType,
        emissor: issuer,
        indexador: indexer,
        forma: form,
        rentabilidade: formatarRentabilidadeRendaFixa({ indexador: indexer, rentabilidade }),
        vencimento: maturity || 'Sem vencimento',
        garantiaFgc: fgc,
      },
    };
  }

  if (categoria === 'cripto') {
    return montarAtivoCripto(base, getValue, getNumber);
  }

  if (categoria === 'fundos imobiliarios') {
    return montarAtivoFiis(base, getValue, getNumber);
  }

  return null;
}

function dadosPrincipaisAtivo(asset) {
  const categoria = normalizarCategoria(asset.category || asset.categoria);
  if (categoria === 'acoes') {
    return formatarDetalhesAcoes(asset);
  }
  if (categoria === 'renda fixa') {
    const compra = asset.purchaseDate ? new Date(`${asset.purchaseDate}T00:00:00`).toLocaleDateString('pt-BR') : '-';
    const vencimento = asset.maturityDate && asset.maturityDate !== 'Sem vencimento'
      ? new Date(`${asset.maturityDate}T00:00:00`).toLocaleDateString('pt-BR')
      : 'Sem vencimento';
    return `Tipo: ${asset.fixedIncomeType || asset.titleType}<br>Emissor: ${asset.issuer || '-'}<br>Indexador: ${asset.indexer || '-'}<br>Rentabilidade: ${asset.yieldInfo}<br>Forma: ${asset.form || '-'}<br>Liquidez: ${asset.liquidity === 'diaria' ? 'Diaria' : 'No vencimento'}<br>Vencimento: ${vencimento}<br>FGC: ${asset.fgc}<br>Compra: ${compra}`;
  }
  if (categoria === 'cripto') {
    return formatarDetalhesCripto(asset);
  }
  if (categoria === 'fundos imobiliarios') {
    return formatarDetalhesFiis(asset);
  }
  return '-';
}

function obterResumoDetalhesAtivo(asset) {
  const detalhes = dadosPrincipaisAtivo(asset)
    .split('<br>')
    .map((item) => item.trim())
    .filter(Boolean);
  return detalhes.slice(0, 4);
}

function obterPerfilAtivoTabela(asset) {
  const categoria = normalizarCategoria(asset.category || asset.categoria);
  if (categoria === 'acoes') return asset.objective || '-';
  if (categoria === 'renda fixa') return asset.titleType || '-';
  if (categoria === 'cripto') return asset.objective || '-';
  if (categoria === 'fundos imobiliarios') return asset.objective || asset.fiiType || '-';
  return '-';
}

function formatarCategoriaAtivo(categoria) {
  const nomes = {
    acoes: 'Acoes',
    'renda fixa': 'Renda Fixa',
    cripto: 'Cripto',
    'fundos imobiliarios': 'Fundos Imobiliarios',
  };
  return nomes[categoria] || categoria;
}

function normalizarCategoria(categoria) {
  const valor = String(categoria || '').trim().toLowerCase();
  if (valor.includes('acao')) return 'acoes';
  if (valor.includes('renda fixa')) return 'renda fixa';
  if (valor.includes('cripto')) return 'cripto';
  if (valor.includes('fundo')) return 'fundos imobiliarios';
  return valor;
}

function normalizarRisco(risco) {
  const valor = String(risco || '').trim().toLowerCase();
  if (valor.includes('baixo')) return 'baixo';
  if (valor.includes('medio') || valor.includes('médio')) return 'medio';
  if (valor.includes('alto')) return 'alto';
  return valor;
}

async function carregarAtivosSalvos() {
  try {
    const data = await requestApi('/api/portfolio/assets');
    state.assets = Array.isArray(data.assets) ? data.assets : [];
  } catch (_error) {
    const assetsLocal = localStorage.getItem(STORAGE_KEY_FALLBACK);
    state.assets = assetsLocal ? JSON.parse(assetsLocal) : [];
  }
}

async function salvarAtivoNoBackend(ativo) {
  try {
    const data = await requestApi('/api/portfolio/assets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ativo),
    });
    return data.asset;
  } catch (_error) {
    const salvoLocal = { ...ativo, id: String(ativo.id || `${Date.now()}-${Math.floor(Math.random() * 100000)}`) };
    const assetsLocal = localStorage.getItem(STORAGE_KEY_FALLBACK);
    const lista = assetsLocal ? JSON.parse(assetsLocal) : [];
    lista.push(salvoLocal);
    localStorage.setItem(STORAGE_KEY_FALLBACK, JSON.stringify(lista));
    return salvoLocal;
  }
}

async function removerAtivoDoBackend(id) {
  try {
    await requestApi(`/api/portfolio/assets/${id}`, { method: 'DELETE' });
  } catch (_error) {
    const assetsLocal = localStorage.getItem(STORAGE_KEY_FALLBACK);
    const lista = assetsLocal ? JSON.parse(assetsLocal) : [];
    const atualizada = lista.filter((asset) => String(asset.id) !== String(id));
    localStorage.setItem(STORAGE_KEY_FALLBACK, JSON.stringify(atualizada));
  }
}

async function removerAtivo(id) {
  await removerAtivoDoBackend(id);
  state.assets = state.assets.filter((asset) => String(asset.id) !== String(id));
  await atualizarDashboardCarteira();
}

function setCampoValor(id, valor) {
  const el = document.getElementById(id);
  if (!el || valor === undefined || valor === null) return;
  if (el.type === 'checkbox') el.checked = Boolean(valor);
  else el.value = String(valor);
  el.dispatchEvent(new Event(el.type === 'checkbox' ? 'change' : 'input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
}

function preencherFormularioEdicaoAtivo(asset) {
  setCampoValor('assetOperation', asset.operation || asset.operacao || 'compra');
  setCampoValor('assetPurchaseDate', asset.purchaseDate || asset.dataCompra || '');
  setCampoValor('assetQuantity', asset.quantity || asset.quantidadeCotas || '');
  setCampoValor('assetUnitPrice', asset.unitPrice || asset.precoUnitario || asset.averagePrice || '');
  setCampoValor('assetOtherCosts', asset.otherCosts || asset.outrosCustos || 0);
  setCampoValor('assetObjective', asset.objective || asset.objetivo || '');

  const categoria = normalizarCategoria(asset.category || asset.categoria);

  if (categoria === 'acoes') {
    const tickerConhecido = ['PETR4', 'VALE3', 'ITUB4', 'BBAS3', 'WEGE3', 'BBDC4', 'ABEV3', 'MGLU3'].includes(asset.stockTicker || asset.ticker || asset.name);
    setCampoValor('assetTicker', tickerConhecido ? (asset.stockTicker || asset.ticker || asset.name) : 'Outra');
    if (!tickerConhecido) setCampoValor('assetStockCustomName', asset.name);
    setCampoValor('assetSector', asset.sector || asset.setor || '');
    calcularValorTotalAcoes();
    return;
  }

  if (categoria === 'cripto') {
    const criptoConhecida = ['Bitcoin', 'Ethereum', 'Solana', 'BNB', 'XRP', 'Cardano', 'Dogecoin'].includes(asset.cryptoAsset || asset.name);
    setCampoValor('assetCryptoName', criptoConhecida ? (asset.cryptoAsset || asset.name) : 'Outra');
    if (!criptoConhecida) setCampoValor('assetCryptoCustomName', asset.name);
    calcularValorTotalCripto();
    return;
  }

  if (categoria === 'fundos imobiliarios') {
    const fiiConhecido = ['MXRF11', 'HGLG11', 'KNRI11', 'XPML11', 'VISC11', 'BCFF11', 'XPLG11', 'HGRU11', 'KNSC11'].includes(asset.fiiTicker || asset.name);
    setCampoValor('assetFiiTicker', fiiConhecido ? (asset.fiiTicker || asset.name) : 'Outra');
    if (!fiiConhecido) setCampoValor('assetFiiCustomName', asset.name);
    setCampoValor('assetFiiType', asset.fiiType || asset.tipoFii || '');
    setCampoValor('assetSegment', asset.segment || asset.segmento || '');
    setCampoValor('assetDyMonthly', asset.dyMonthly ?? asset.dividendYieldMensal ?? '');
    calcularValorTotalFiis();
    return;
  }

  if (categoria === 'renda fixa') {
    setCampoValor('assetFixedIncomeType', asset.fixedIncomeType || asset.titleType || '');
    setCampoValor('assetIssuer', asset.issuer || asset.emissor || '');
    setCampoValor('assetName', asset.name || asset.nome || '');
    setCampoValor('assetIndexer', asset.indexer || asset.indexador || '');
    const rentabilidade = asset.rentabilidade || {};
    setCampoValor('assetCdiPercent', rentabilidade.percentualCdi ?? '');
    setCampoValor('assetAdditionalRate', rentabilidade.taxaAdicional ?? '');
    setCampoValor('assetIpcaRate', rentabilidade.taxaIpca ?? '');
    setCampoValor('assetPrefixedRate', rentabilidade.taxaPrefixada ?? '');
    setCampoValor('assetSelicPercent', rentabilidade.percentualSelic ?? '');
    setCampoValor('assetYieldDescription', rentabilidade.descricao ?? '');
    setCampoValor('assetForm', asset.form || asset.forma || '');
    setCampoValor('assetValue', asset.value || asset.valorInvestido || '');
    setCampoValor('assetDailyLiquidity', asset.liquidityDaily || asset.liquidezDiaria || asset.liquidity === 'diaria');
    setCampoValor('assetMaturity', asset.maturityDate === 'Sem vencimento' ? '' : asset.maturityDate);
    setCampoValor('assetFGC', asset.fgc || '');
    const totalDisplayEl = document.getElementById('assetTotalValueDisplay');
    if (totalDisplayEl) totalDisplayEl.value = formatCurrency(asset.value || 0);
  }
}

function iniciarEdicaoAtivo(index) {
  const asset = state.assets[index];
  if (!asset) return;
  ativoEmEdicaoIndex = index;
  abrirAbaDashboard('ativos');

  const categoria = normalizarCategoria(asset.category || asset.categoria);
  const select = document.getElementById('assetCategory');
  select.value = categoria;
  document.querySelectorAll('.asset-type-card').forEach((card) => card.classList.toggle('active', card.dataset.assetCategory === categoria));
  renderizarCamposAtivoPorCategoria(categoria);
  preencherFormularioEdicaoAtivo({ ...asset, category: categoria });

  const submit = document.querySelector('.asset-submit-btn');
  if (submit) submit.textContent = 'Salvar alteracoes';
  document.getElementById('assetForm')?.classList.add('asset-form-editing');
  document.getElementById('assetCancelEditBtn')?.classList.remove('dashboard-hidden');
  setMessage(document.getElementById('assetMessage'), `Editando ${asset.name}. Ajuste os campos e salve as alteracoes.`, 'success');
}

function encerrarEdicaoAtivo() {
  ativoEmEdicaoIndex = null;
  const submit = document.querySelector('.asset-submit-btn');
  if (submit) submit.textContent = 'Adicionar ativo';
  document.getElementById('assetForm')?.classList.remove('asset-form-editing');
  document.getElementById('assetCancelEditBtn')?.classList.add('dashboard-hidden');
}

function obterClassificacaoScore(score) {
  if (score <= 39) return 'Carteira desorganizada';
  if (score <= 59) return 'Carteira fragil';
  if (score <= 79) return 'Carteira razoavel';
  return 'Carteira bem estruturada';
}

function obterDiagnosticoScore(score, metricas) {
  if (score <= 39) return 'Carteira desorganizada e desalinhada com boas praticas basicas.';
  if (score <= 59) return 'Carteira fragil, com baixa diversificacao.';
  if (score <= 79) {
    if (metricas.maxConcentrationPercent >= 35) return 'Carteira razoavel, porem com concentracao relevante.';
    return 'Carteira razoavel, com base boa e ajustes pontuais necessarios.';
  }
  return 'Carteira bem estruturada, mas ainda com pontos de melhoria.';
}

function obterNivelScore(score) {
  if (score <= 39) return 'critico';
  if (score <= 59) return 'atencao';
  if (score <= 79) return 'bom';
  return 'excelente';
}

function obterMensagemExecutivaMetricas(score, metricas) {
  if (score <= 39) return 'A carteira precisa de ajustes estruturais antes de crescer: diversificacao, concentracao e risco devem ser revisados.';
  if (score <= 59) return 'A carteira ja possui base, mas ainda esta vulneravel a concentracao ou baixa diversificacao.';
  if (metricas.maxConcentrationPercent >= 35) return 'A estrutura esta razoavel, com atencao especial para o ativo mais concentrado.';
  return 'A carteira apresenta boa organizacao inicial. Continue acompanhando concentracao, liquidez e risco por categoria.';
}

function renderizarCarteira() {
  const body = document.getElementById('portfolioTableBody');
  const cards = document.getElementById('portfolioCards');

  if (state.assets.length === 0) {
    body.innerHTML = '<tr><td colspan="7" class="empty-row">Nenhum ativo cadastrado. Escolha uma categoria e adicione seu primeiro ativo.</td></tr>';
    if (cards) cards.innerHTML = '<div class="portfolio-empty-card"><strong>Nenhum investimento cadastrado</strong><span>Adicione ativos para montar a visualizacao premium da carteira.</span></div>';
    return;
  }

  const total = state.assets.reduce((soma, asset) => soma + Number(asset.value || 0), 0);
  if (cards) {
    cards.innerHTML = state.assets.map((asset, index) => {
      const categoria = normalizarCategoria(asset.category || asset.categoria);
      const risco = normalizarRisco(asset.risk || asset.risco);
      const valor = Number(asset.value || 0);
      const percentual = total > 0 ? (valor / total) * 100 : 0;
      const detalhes = obterResumoDetalhesAtivo(asset).slice(0, 3);
      return `
        <article class="portfolio-card-item risk-card-${risco}">
          <div class="portfolio-card-top">
            <span class="portfolio-category-badge">${formatarCategoriaAtivo(categoria)}</span>
            <span class="risk-badge risk-${risco}">${asset.risk || asset.risco}</span>
          </div>
          <div>
            <h3>${asset.name}</h3>
            <p>${asset.ticker || asset.tipoAtivo || asset.type || 'Ativo cadastrado'}</p>
          </div>
          <strong class="portfolio-card-value">${formatCurrency(valor)}</strong>
          <div class="portfolio-card-progress"><div style="width:${Math.min(100, percentual)}%"></div></div>
          <div class="portfolio-card-meta">
            <span>${formatarPercentual(percentual)} da carteira</span>
            <span>${obterPerfilAtivoTabela(asset)}</span>
          </div>
          <div class="portfolio-card-details">${detalhes.map((detalhe) => `<span>${detalhe}</span>`).join('')}</div>
          <div class="portfolio-card-actions">
            <button type="button" class="edit-btn" data-index="${index}">Editar</button>
            <button type="button" class="remove-btn" data-index="${index}">Remover</button>
          </div>
        </article>
      `;
    }).join('');
  }

  body.innerHTML = state.assets.map((asset, index) => {
    const categoria = normalizarCategoria(asset.category || asset.categoria);
    const detalhes = obterResumoDetalhesAtivo(asset);
    const risco = normalizarRisco(asset.risk || asset.risco);
    return `
      <tr class="portfolio-row">
        <td>
          <span class="portfolio-category-badge">${formatarCategoriaAtivo(categoria)}</span>
        </td>
        <td>
          <div class="portfolio-asset-name">${asset.name}</div>
          <span class="portfolio-asset-meta">${asset.ticker || asset.tipoAtivo || asset.type || 'Ativo cadastrado'}</span>
        </td>
        <td>
          <strong class="portfolio-value">${formatCurrency(asset.value)}</strong>
        </td>
        <td>
          <span class="portfolio-pill">${obterPerfilAtivoTabela(asset)}</span>
        </td>
        <td>
          <span class="risk-badge risk-${risco}">${asset.risk || asset.risco}</span>
        </td>
        <td class="asset-details">
          <div class="asset-detail-list">
            ${detalhes.map((detalhe) => `<span>${detalhe}</span>`).join('')}
          </div>
        </td>
        <td>
          <div class="portfolio-actions">
            <button type="button" class="edit-btn" data-index="${index}">Editar</button>
            <button type="button" class="remove-btn" data-index="${index}">Remover</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  document.querySelectorAll('.edit-btn').forEach((btn) => {
    btn.addEventListener('click', () => iniciarEdicaoAtivo(Number(btn.dataset.index)));
  });

  document.querySelectorAll('.remove-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const index = Number(btn.dataset.index);
      const asset = state.assets[index];
      if (!asset) return;
      try {
        await removerAtivo(asset.id);
      } catch (_error) {
        renderizarRecomendacoes();
      }
    });
  });
}

async function calcularMetricasCarteira() {
  const investorProfile = state.profileAnalysis ? state.profileAnalysis.investorProfile : null;
  state.portfolioMetrics = await postData('/api/portfolio-metrics', {
    assets: state.assets,
    investorProfile,
  });
}

function renderizarMetricasCarteira() {
  const grid = document.getElementById('metricsGrid');
  if (!state.portfolioMetrics) {
    grid.innerHTML = '<p>Adicione ativos para visualizar metricas.</p>';
    return;
  }

  const m = state.portfolioMetrics;
  const score = Number(m.score || 0);
  const scoreLabel = obterClassificacaoScore(score);
  const scoreDiagnostico = obterDiagnosticoScore(score, m);
  const scoreNivel = obterNivelScore(score);
  const mensagemExecutiva = obterMensagemExecutivaMetricas(score, m);
  grid.innerHTML = `
    <section class="metrics-hero score-${scoreNivel}">
      <div class="metrics-hero-copy">
        <span class="section-kicker">Diagnostico da carteira</span>
        <h3>${scoreLabel}</h3>
        <p>${mensagemExecutiva}</p>
      </div>
      <div class="score-radial metrics-score-radial" style="--score-percent:${Math.max(0, Math.min(100, score))}%;">
        <span>${score}</span>
        <small>/100</small>
      </div>
    </section>

    <section class="metrics-section">
      <div class="metrics-section-heading"><span>Resumo financeiro</span><strong>Base da carteira</strong></div>
      <div class="metric-main-grid metrics-highlight-grid">
        <div class="metric-main-item"><strong>Valor total investido</strong><span class="metric-value">${formatCurrency(m.totalInvested)}</span></div>
        <div class="metric-main-item"><strong>Quantidade de ativos</strong><span class="metric-value">${m.assetsCount}</span></div>
        <div class="metric-main-item"><strong>Categorias</strong><span class="metric-value">${m.typesCount}</span></div>
        <div class="metric-main-item"><strong>Diversificacao</strong><span class="metric-value">${m.diversification}</span></div>
      </div>
    </section>

    <section class="metrics-section metrics-two-columns">
      <div>
        <div class="metrics-section-heading"><span>Risco</span><strong>Concentracao e exposicao</strong></div>
        <div class="metric-secondary-grid compact-metrics-grid">
          <div class="metric-item"><strong>Maior concentracao</strong><span class="metric-value">${m.maxConcentrationPercent.toFixed(2)}%</span></div>
          <div class="metric-item"><strong>Ativo dominante</strong><span class="metric-value">${m.topConcentrationAsset}</span></div>
          <div class="metric-item"><strong>Risco alto</strong><span class="metric-value">${m.percentHighRisk.toFixed(2)}%</span></div>
          <div class="metric-item"><strong>Risco geral</strong><span class="metric-value">${m.riskClassification}</span></div>
        </div>
      </div>
      <div>
        <div class="metrics-section-heading"><span>Alocacao</span><strong>Defensivo x oscilante</strong></div>
        <div class="metric-secondary-grid compact-metrics-grid">
          <div class="metric-item"><strong>Renda fixa</strong><span class="metric-value">${m.percentFixedIncome.toFixed(2)}%</span></div>
          <div class="metric-item"><strong>Renda variavel</strong><span class="metric-value">${m.percentVariableIncome.toFixed(2)}%</span></div>
          <div class="metric-item"><strong>Liquidez diaria</strong><span class="metric-value">${m.percentDailyLiquidity.toFixed(2)}%</span></div>
          <div class="metric-item"><strong>Diagnostico</strong><span class="metric-value">${scoreDiagnostico}</span></div>
        </div>
      </div>
    </section>
  `;
}

function obterDadosGraficoCategorias() {
  const categorias = ['acoes', 'renda fixa', 'cripto', 'fundos imobiliarios'];
  const labels = ['Acoes', 'Renda Fixa', 'Cripto', 'Fundos Imobiliarios'];
  const data = categorias.map((categoria) =>
    state.assets
      .filter((asset) => normalizarCategoria(asset.category) === categoria)
      .reduce((soma, asset) => soma + Number(asset.value || 0), 0)
  );
  return { labels, data };
}

function obterDadosGraficoRendaFixaVariavel() {
  const rendaFixa = state.assets
    .filter((asset) => normalizarCategoria(asset.category) === 'renda fixa')
    .reduce((soma, asset) => soma + Number(asset.value || 0), 0);
  const rendaVariavel = state.assets
    .filter((asset) => ['acoes', 'cripto', 'fundos imobiliarios'].includes(normalizarCategoria(asset.category)))
    .reduce((soma, asset) => soma + Number(asset.value || 0), 0);
  const labels = ['Renda Fixa', 'Renda Variavel'];
  const data = [rendaFixa, rendaVariavel];
  return { labels, data };
}

function obterDadosGraficoConcentracao() {
  const total = state.assets.reduce((soma, asset) => soma + Number(asset.value || 0), 0);
  const ativosOrdenados = [...state.assets].sort((a, b) => Number(b.value || 0) - Number(a.value || 0));
  const ativosExibicao = ativosOrdenados.length > 10 ? ativosOrdenados.slice(0, 10) : ativosOrdenados;
  const labels = ativosExibicao.map((asset) => asset.name);
  const valores = ativosExibicao.map((asset) => Number(asset.value || 0));
  const percentuais = valores.map((valor) => (total > 0 ? (valor / total) * 100 : 0));
  return { labels, valores, percentuais };
}

function obterDadosGraficoRisco() {
  const grupos = [
    { key: 'baixo', label: 'Baixo' },
    { key: 'medio', label: 'Medio' },
    { key: 'alto', label: 'Alto' },
  ];
  return {
    labels: grupos.map((grupo) => grupo.label),
    data: grupos.map((grupo) => state.assets
      .filter((asset) => normalizarRisco(asset.risk || asset.risco) === grupo.key)
      .reduce((soma, asset) => soma + Number(asset.value || 0), 0)),
  };
}

function obterDadosGraficoLiquidez() {
  const liquidezDiaria = state.assets
    .filter((asset) => String(asset.liquidity || asset.liquidez || '').toLowerCase().includes('diaria'))
    .reduce((soma, asset) => soma + Number(asset.value || 0), 0);
  const total = state.assets.reduce((soma, asset) => soma + Number(asset.value || 0), 0);
  return { labels: ['Liquidez diaria', 'Outros prazos'], data: [liquidezDiaria, Math.max(0, total - liquidezDiaria)] };
}

function normalizarDataAporte(asset) {
  const raw = asset.purchaseDate || asset.dataCompra || asset.createdAt || '';
  const data = raw ? new Date(`${String(raw).slice(0, 10)}T00:00:00`) : new Date();
  return Number.isNaN(data.getTime()) ? new Date() : data;
}

function formatarDataInput(data) {
  return data.toISOString().slice(0, 10);
}

function obterInicioSemana(data) {
  const d = new Date(data);
  const dia = d.getDay();
  const diff = dia === 0 ? -6 : 1 - dia;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function obterChavePeriodo(data, granularidade) {
  const d = new Date(data);
  if (granularidade === 'weekly') {
    const inicio = obterInicioSemana(d);
    return formatarDataInput(inicio);
  }
  if (granularidade === 'yearly') return String(d.getFullYear());
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function obterLabelPeriodo(chave, granularidade) {
  if (granularidade === 'weekly') {
    const data = new Date(`${chave}T00:00:00`);
    return `Semana ${data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`;
  }
  if (granularidade === 'yearly') return chave;
  const [ano, mes] = chave.split('-').map(Number);
  return new Date(ano, mes - 1, 1).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
}

function avancarPeriodo(data, granularidade) {
  const d = new Date(data);
  if (granularidade === 'weekly') d.setDate(d.getDate() + 7);
  else if (granularidade === 'yearly') d.setFullYear(d.getFullYear() + 1);
  else d.setMonth(d.getMonth() + 1);
  return d;
}

function obterDadosGraficoTotalAportado() {
  const granularidade = document.getElementById('contributionGranularity')?.value || 'monthly';
  const datas = state.assets.map(normalizarDataAporte).sort((a, b) => a - b);
  const hoje = new Date();
  const dataInicialPadrao = datas[0] || new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const dataFinalPadrao = datas[datas.length - 1] || hoje;
  const startEl = document.getElementById('contributionStartDate');
  const endEl = document.getElementById('contributionEndDate');

  if (startEl && !startEl.value) startEl.value = formatarDataInput(dataInicialPadrao);
  if (endEl && !endEl.value) endEl.value = formatarDataInput(dataFinalPadrao);

  const inicio = new Date(`${startEl?.value || formatarDataInput(dataInicialPadrao)}T00:00:00`);
  const fim = new Date(`${endEl?.value || formatarDataInput(dataFinalPadrao)}T23:59:59`);
  const inicioPeriodo = granularidade === 'weekly'
    ? obterInicioSemana(inicio)
    : granularidade === 'yearly'
      ? new Date(inicio.getFullYear(), 0, 1)
      : new Date(inicio.getFullYear(), inicio.getMonth(), 1);

  const valoresPorPeriodo = {};
  state.assets.forEach((asset) => {
    const data = normalizarDataAporte(asset);
    if (data < inicio || data > fim) return;
    const chave = obterChavePeriodo(data, granularidade);
    valoresPorPeriodo[chave] = (valoresPorPeriodo[chave] || 0) + Number(asset.value || 0);
  });

  const labels = [];
  const aportes = [];
  const acumulado = [];
  let cursor = inicioPeriodo;
  let total = 0;
  while (cursor <= fim) {
    const chave = obterChavePeriodo(cursor, granularidade);
    const valor = valoresPorPeriodo[chave] || 0;
    total += valor;
    labels.push(obterLabelPeriodo(chave, granularidade));
    aportes.push(valor);
    acumulado.push(total);
    cursor = avancarPeriodo(cursor, granularidade);
  }

  return { labels, aportes, acumulado };
}

function destruirGraficosCarteira() {
  Object.keys(chartsCarteira).forEach((key) => {
    if (chartsCarteira[key]) {
      chartsCarteira[key].destroy();
      chartsCarteira[key] = null;
    }
  });
}

function renderizarGraficosCarteira() {
  const painelAtivo = document.querySelector('.dashboard-panel.active')?.dataset?.panel || '';
  if (!['overview', 'graficos'].includes(painelAtivo)) return;

  const totalInvestido = state.assets.reduce((soma, asset) => soma + Number(asset.value || 0), 0);
  const assinatura = [
    painelAtivo,
    state.assets.length,
    totalInvestido.toFixed(2),
    Number(state.portfolioMetrics?.score || 0),
    state.concentrationChartView,
    document.getElementById('contributionGranularity')?.value || 'monthly',
    document.getElementById('contributionStartDate')?.value || '',
    document.getElementById('contributionEndDate')?.value || '',
  ].join('|');
  if (assinatura === chartsLastSignature) return;

  const categoriasCanvas = document.getElementById('chartCategorias');
  const rendaFixaVariavelCanvas = document.getElementById('chartRendaFixaVariavel');
  const concentracaoCanvas = document.getElementById('chartConcentracao');
  const scoreCanvas = document.getElementById('chartScoreCarteira');
  const categoriasDetalheCanvas = document.getElementById('chartCategoriasDetalhe');
  const riscoCanvas = document.getElementById('chartRiscoCarteira');
  const liquidezCanvas = document.getElementById('chartLiquidezCarteira');
  const valorAtivosCanvas = document.getElementById('chartValorAtivos');
  const totalAportadoCanvas = document.getElementById('chartTotalAportado');

  if (!categoriasCanvas || !rendaFixaVariavelCanvas || !concentracaoCanvas) return;

  destruirGraficosCarteira();

  if (!state.assets.length || typeof Chart === 'undefined') return;

  const dadosCategorias = obterDadosGraficoCategorias();
  const dadosRendaFixaVariavel = obterDadosGraficoRendaFixaVariavel();
  const dadosConcentracao = obterDadosGraficoConcentracao();
  const dadosRisco = obterDadosGraficoRisco();
  const dadosLiquidez = obterDadosGraficoLiquidez();
  const dadosTotalAportado = obterDadosGraficoTotalAportado();
  const score = Number(state.portfolioMetrics?.score || 0);

  chartsCarteira.categorias = new Chart(categoriasCanvas, {
    type: 'doughnut',
    data: {
      labels: dadosCategorias.labels,
      datasets: [{
        data: dadosCategorias.data,
        backgroundColor: ['#d6a93f', '#f4d67a', '#b88623', '#72511b'],
        borderWidth: 2,
        borderColor: '#15191a',
        hoverOffset: 5,
        cutout: '68%',
        radius: '82%',
      }],
    },
    options: {
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { boxWidth: 8, boxHeight: 8, color: '#cdbf9a', usePointStyle: true, pointStyle: 'circle', padding: 14 } },
        tooltip: {
          backgroundColor: '#111617',
          borderColor: '#3a301d',
          borderWidth: 1,
          titleColor: '#fff7dc',
          bodyColor: '#d8ccb0',
          callbacks: {
            label(context) {
              const label = context.label || '';
              const valor = Number(context.raw || 0);
              const total = context.dataset.data.reduce((acc, item) => acc + Number(item || 0), 0);
              const percentual = total > 0 ? (valor / total) * 100 : 0;
              return `${label}: ${formatarMoeda(valor)} (${formatarPercentual(percentual)})`;
            },
          },
        },
      },
    },
  });

  chartsCarteira.rendaFixaVariavel = new Chart(rendaFixaVariavelCanvas, {
    type: 'doughnut',
    data: {
      labels: dadosRendaFixaVariavel.labels,
      datasets: [{
        data: dadosRendaFixaVariavel.data,
        backgroundColor: ['#f4d67a', '#b88623'],
        borderWidth: 2,
        borderColor: '#15191a',
        hoverOffset: 5,
        cutout: '68%',
        radius: '82%',
      }],
    },
    options: {
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { boxWidth: 8, boxHeight: 8, color: '#cdbf9a', usePointStyle: true, pointStyle: 'circle', padding: 14 } },
        tooltip: {
          backgroundColor: '#111617',
          borderColor: '#3a301d',
          borderWidth: 1,
          titleColor: '#fff7dc',
          bodyColor: '#d8ccb0',
          callbacks: {
            label(context) {
              const label = context.label || '';
              const valor = Number(context.raw || 0);
              const total = context.dataset.data.reduce((acc, item) => acc + Number(item || 0), 0);
              const percentual = total > 0 ? (valor / total) * 100 : 0;
              return `${label}: ${formatarMoeda(valor)} (${formatarPercentual(percentual)})`;
            },
          },
        },
      },
    },
  });

  if (scoreCanvas) {
    chartsCarteira.score = new Chart(scoreCanvas, {
      type: 'doughnut',
      data: {
        labels: ['Score', 'Espaco para evoluir'],
        datasets: [{
          data: [score, Math.max(0, 100 - score)],
          backgroundColor: ['#d6a93f', '#25231d'],
          borderWidth: 0,
          cutout: '76%',
          radius: '82%',
        }],
      },
      options: {
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label(context) {
                return `${context.label}: ${Number(context.raw || 0).toFixed(0)}%`;
              },
            },
          },
        },
      },
      plugins: [{
        id: 'scoreCenterText',
        afterDraw(chart) {
          const { ctx, chartArea } = chart;
          if (!chartArea) return;
          ctx.save();
          ctx.fillStyle = '#fff7dc';
          ctx.font = '700 24px Segoe UI, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(String(score), (chartArea.left + chartArea.right) / 2, (chartArea.top + chartArea.bottom) / 2);
          ctx.restore();
        },
      }],
    });
  }

  if (totalAportadoCanvas) {
    chartsCarteira.totalAportado = new Chart(totalAportadoCanvas, {
      type: 'line',
      data: {
        labels: dadosTotalAportado.labels,
        datasets: [
          {
            label: 'Total acumulado',
            data: dadosTotalAportado.acumulado,
            borderColor: '#d6a93f',
            backgroundColor: 'rgba(214,169,63,.12)',
            fill: true,
            tension: .35,
            pointRadius: 3,
            pointHoverRadius: 5,
          },
          {
            label: 'Aporte no periodo',
            data: dadosTotalAportado.aportes,
            borderColor: '#6fb07a',
            backgroundColor: 'rgba(111,176,122,.1)',
            borderDash: [6, 6],
            tension: .35,
            pointRadius: 2,
          },
        ],
      },
      options: {
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 8, boxHeight: 8, color: '#cdbf9a', usePointStyle: true, pointStyle: 'circle', padding: 14 } },
          tooltip: { callbacks: { label: (context) => `${context.dataset.label}: ${formatarMoeda(context.raw)}` } },
        },
        scales: {
          x: { ticks: { color: '#cdbf9a' }, grid: { display: false } },
          y: { beginAtZero: true, ticks: { callback: (value) => formatarMoeda(value), color: '#cdbf9a' }, grid: { color: 'rgba(214,169,63,.08)' } },
        },
      },
    });
  }

  const concentracaoComoPizza = state.concentrationChartView === 'pie';
  chartsCarteira.concentracao = new Chart(concentracaoCanvas, {
    type: concentracaoComoPizza ? 'doughnut' : 'bar',
    data: {
      labels: dadosConcentracao.labels,
      datasets: [{
        label: '% da carteira',
        data: dadosConcentracao.percentuais,
        backgroundColor: concentracaoComoPizza
          ? ['#d6a93f', '#f4d67a', '#b88623', '#6fb07a', '#d66f58', '#7f9ccf', '#d2a6ff', '#90d2c2', '#c97855', '#72511b']
          : '#d6a93f',
        borderColor: concentracaoComoPizza ? '#15191a' : undefined,
        borderWidth: concentracaoComoPizza ? 2 : 0,
        borderRadius: concentracaoComoPizza ? 0 : 8,
        borderSkipped: false,
        maxBarThickness: 34,
        hoverOffset: concentracaoComoPizza ? 6 : 0,
        cutout: concentracaoComoPizza ? '58%' : undefined,
      }],
    },
    options: {
      maintainAspectRatio: false,
      plugins: {
        legend: concentracaoComoPizza
          ? { position: 'bottom', labels: { boxWidth: 8, boxHeight: 8, color: '#cdbf9a', usePointStyle: true, pointStyle: 'circle', padding: 14 } }
          : { display: false },
        tooltip: {
          backgroundColor: '#111617',
          borderColor: '#3a301d',
          borderWidth: 1,
          titleColor: '#fff7dc',
          bodyColor: '#d8ccb0',
          callbacks: {
            label(context) {
              const label = context.label || '';
              const percentual = Number(context.raw || 0);
              const valor = Number(dadosConcentracao.valores[context.dataIndex] || 0);
              return `${label}: ${formatarMoeda(valor)} (${formatarPercentual(percentual)})`;
            },
          },
        },
      },
      scales: concentracaoComoPizza ? {} : {
        x: { ticks: { color: '#cdbf9a' }, grid: { display: false } },
        y: { beginAtZero: true, ticks: { callback: (value) => formatarPercentual(value), color: '#cdbf9a' }, grid: { color: 'rgba(214,169,63,.08)' } },
      },
    },
  });

  if (categoriasDetalheCanvas) {
    chartsCarteira.categoriasDetalhe = new Chart(categoriasDetalheCanvas, {
      type: 'doughnut',
      data: {
        labels: dadosCategorias.labels,
        datasets: [{
          data: dadosCategorias.data,
          backgroundColor: ['#d6a93f', '#f4d67a', '#b88623', '#6fb07a'],
          borderWidth: 2,
          borderColor: '#15191a',
          cutout: '62%',
        }],
      },
      options: {
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 8, boxHeight: 8, color: '#cdbf9a', usePointStyle: true, pointStyle: 'circle', padding: 14 } },
          tooltip: {
            backgroundColor: '#111617',
            borderColor: '#3a301d',
            borderWidth: 1,
            titleColor: '#fff7dc',
            bodyColor: '#d8ccb0',
            callbacks: { label: (context) => `${context.label}: ${formatarMoeda(context.raw)}` },
          },
      },
    },
  });

  if (liquidezCanvas) {
    chartsCarteira.liquidez = new Chart(liquidezCanvas, {
      type: 'doughnut',
      data: {
        labels: dadosLiquidez.labels,
        datasets: [{
          data: dadosLiquidez.data,
          backgroundColor: ['#5fbf75', '#2a3431'],
          borderWidth: 2,
          borderColor: '#15191a',
          cutout: '70%',
        }],
      },
      options: {
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 8, boxHeight: 8, color: '#cdbf9a', usePointStyle: true, pointStyle: 'circle', padding: 14 } },
          tooltip: { callbacks: { label: (context) => `${context.label}: ${formatarMoeda(context.raw)}` } },
        },
      },
    });
  }

  if (valorAtivosCanvas) {
    chartsCarteira.valorAtivos = new Chart(valorAtivosCanvas, {
      type: 'bar',
      data: {
        labels: dadosConcentracao.labels,
        datasets: [{
          label: 'Valor investido',
          data: dadosConcentracao.valores,
          backgroundColor: '#d6a93f',
          borderRadius: 8,
          borderSkipped: false,
          maxBarThickness: 34,
        }],
      },
      options: {
        indexAxis: 'y',
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: (context) => formatarMoeda(context.raw) } },
        },
        scales: {
          x: { beginAtZero: true, ticks: { callback: (value) => formatarMoeda(value), color: '#cdbf9a' }, grid: { color: 'rgba(214,169,63,.08)' } },
          y: { ticks: { color: '#cdbf9a' }, grid: { display: false } },
        },
      },
    });
  }
}

  if (riscoCanvas) {
    chartsCarteira.risco = new Chart(riscoCanvas, {
      type: 'bar',
      data: {
        labels: dadosRisco.labels,
        datasets: [{
          label: 'Valor em risco',
          data: dadosRisco.data,
          backgroundColor: ['#5fbf75', '#e0a33a', '#d65b4a'],
          borderRadius: 8,
          borderSkipped: false,
          maxBarThickness: 42,
        }],
      },
      options: {
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: (context) => formatarMoeda(context.raw) } },
        },
        scales: {
          x: { ticks: { color: '#cdbf9a' }, grid: { display: false } },
          y: { beginAtZero: true, ticks: { callback: (value) => formatarMoeda(value), color: '#cdbf9a' }, grid: { color: 'rgba(214,169,63,.08)' } },
        },
      },
    });
  }

  chartsLastSignature = assinatura;
}

function calcularScoreCarteiraLocal(metricas, perfilInvestidor) {
  let score = 100;
  if (metricas.assetsCount < 2) score -= 30;
  else if (metricas.assetsCount < 3) score -= 15;
  if (metricas.typesCount <= 1) score -= 25;
  else if (metricas.typesCount === 2) score -= 10;
  if (metricas.maxConcentrationPercent > 50) score -= 20;
  else if (metricas.maxConcentrationPercent >= 35) score -= 10;
  if (metricas.percentCrypto > 30) score -= 15;
  if (metricas.percentHighRisk > 40) score -= 15;
  if (metricas.percentFixedIncome === 0) score -= 10;
  if (metricas.diversification === 'Baixa') score -= 15;
  else if (metricas.diversification === 'Media') score -= 5;
  if (perfilInvestidor && (perfilInvestidor.perfil === 'Conservador severo' || perfilInvestidor.perfil === 'Conservador moderado') && metricas.percentHighRisk > 25) {
    score -= metricas.percentHighRisk > 45 ? 20 : 10;
  }
  return Math.max(0, Math.min(100, Math.round(score)));
}

function construirMetricasRecomendacoes(ativos, metricas) {
  const listaAtivos = Array.isArray(ativos) ? ativos : [];
  if (metricas && typeof metricas === 'object') {
    const total = Number(metricas.totalInvested || 0);
    const cripto = listaAtivos
      .filter((asset) => normalizarCategoria(asset.category) === 'cripto')
      .reduce((soma, asset) => soma + Number(asset.value || 0), 0);
    return {
      totalInvested: total,
      assetsCount: Number(metricas.assetsCount || listaAtivos.length),
      typesCount: Number(metricas.typesCount || new Set(listaAtivos.map((a) => normalizarCategoria(a.category))).size),
      maxConcentrationPercent: Number(metricas.maxConcentrationPercent || 0),
      topConcentrationAsset: metricas.topConcentrationAsset || '-',
      percentFixedIncome: Number(metricas.percentFixedIncome || 0),
      percentVariableIncome: Number(metricas.percentVariableIncome || 0),
      percentHighRisk: Number(metricas.percentHighRisk || 0),
      percentDailyLiquidity: Number(metricas.percentDailyLiquidity || 0),
      diversification: metricas.diversification || 'Baixa',
      riskClassification: metricas.riskClassification || 'Indefinido',
      percentCrypto: total > 0 ? (cripto / total) * 100 : 0,
      score: Number(metricas.score || 0),
    };
  }

  const totalInvested = listaAtivos.reduce((soma, asset) => soma + Number(asset.value || 0), 0);
  const categorias = ['acoes', 'renda fixa', 'cripto', 'fundos imobiliarios'];
  const valoresPorCategoria = categorias.reduce((acc, categoria) => {
    acc[categoria] = listaAtivos
      .filter((asset) => normalizarCategoria(asset.category) === categoria)
      .reduce((soma, asset) => soma + Number(asset.value || 0), 0);
    return acc;
  }, {});
  const ativosOrdenados = [...listaAtivos].sort((a, b) => Number(b.value || 0) - Number(a.value || 0));
  const maiorAtivo = ativosOrdenados[0];
  const percentHighRisk = totalInvested > 0
    ? (listaAtivos.filter((a) => normalizarRisco(a.risk) === 'alto').reduce((soma, a) => soma + Number(a.value || 0), 0) / totalInvested) * 100
    : 0;
  const percentDailyLiquidity = totalInvested > 0
    ? (listaAtivos.filter((a) => String(a.liquidity || a.liquidez || '').includes('diaria')).reduce((soma, a) => soma + Number(a.value || 0), 0) / totalInvested) * 100
    : 0;
  const typesCount = Object.values(valoresPorCategoria).filter((v) => v > 0).length;
  const percentFixedIncome = totalInvested > 0 ? (valoresPorCategoria['renda fixa'] / totalInvested) * 100 : 0;
  const percentVariableIncome = totalInvested > 0 ? ((totalInvested - valoresPorCategoria['renda fixa']) / totalInvested) * 100 : 0;
  const percentCrypto = totalInvested > 0 ? (valoresPorCategoria.cripto / totalInvested) * 100 : 0;
  const maxConcentrationPercent = totalInvested > 0 && maiorAtivo ? (Number(maiorAtivo.value || 0) / totalInvested) * 100 : 0;
  const diversification = typesCount <= 1 ? 'Baixa' : (typesCount === 2 ? 'Media' : 'Alta');
  const riskClassification = percentHighRisk > 45 ? 'Alto' : (percentHighRisk >= 20 ? 'Medio' : 'Baixo');

  return {
    totalInvested,
    assetsCount: listaAtivos.length,
    typesCount,
    maxConcentrationPercent,
    topConcentrationAsset: maiorAtivo?.name || '-',
    percentFixedIncome,
    percentVariableIncome,
    percentHighRisk,
    percentDailyLiquidity,
    diversification,
    riskClassification,
    percentCrypto,
    score: 0,
  };
}

function gerarRecomendacoesAutomaticas(perfilInvestidor, ativos, metricas) {
  const listaAtivos = Array.isArray(ativos) ? ativos : [];
  if (!listaAtivos.length) {
    return [{
      tipo: 'informativo',
      titulo: 'Cadastre seus primeiros ativos',
      descricao: 'Cadastre seus primeiros ativos para receber recomendacoes automaticas.',
      prioridade: 'media',
    }];
  }

  const m = construirMetricasRecomendacoes(listaAtivos, metricas);
  if (!m.score || Number.isNaN(m.score)) m.score = calcularScoreCarteiraLocal(m, perfilInvestidor);

  const recomendacoes = [];
  const titulos = new Set();
  const adicionar = (tipo, titulo, descricao, prioridade) => {
    if (titulos.has(titulo)) return;
    titulos.add(titulo);
    recomendacoes.push({ tipo, titulo, descricao, prioridade });
  };

  if (!perfilInvestidor) {
    adicionar('informativo', 'Responda o questionario de perfil', 'O perfil do investidor ajuda o sistema a comparar sua carteira com sua tolerancia a risco.', 'media');
  }

  if (m.score < 40) adicionar('alerta', 'Carteira desorganizada', 'O score indica que sua carteira precisa de ajustes importantes, principalmente em diversificacao, concentracao e alinhamento com o seu perfil.', 'alta');
  else if (m.score <= 59) adicionar('melhoria', 'Carteira fragil', 'Sua carteira possui alguns pontos de atencao. Vale revisar concentracao, quantidade de ativos e distribuicao entre categorias.', 'alta');
  else if (m.score <= 79) adicionar('melhoria', 'Carteira razoavel', 'Sua carteira ja possui uma estrutura inicial, mas ainda existem melhorias possiveis para reduzir riscos e aumentar equilibrio.', 'media');
  else adicionar('positivo', 'Carteira bem estruturada', 'Sua carteira apresenta boa estrutura inicial, mas ainda deve ser acompanhada e rebalanceada com o tempo.', 'baixa');

  if (m.assetsCount === 1) adicionar('alerta', 'Carteira concentrada em apenas um ativo', 'Sua carteira depende de um unico investimento. Isso aumenta o risco de concentracao.', 'alta');
  else if (m.assetsCount < 3) adicionar('melhoria', 'Poucos ativos cadastrados', 'Considere adicionar mais ativos para melhorar a diversificacao.', 'media');

  if (m.typesCount === 1) adicionar('alerta', 'Baixa diversificacao entre categorias', 'Sua carteira esta concentrada em apenas uma classe de investimento.', 'alta');
  else if (m.typesCount === 2) adicionar('melhoria', 'Diversificacao ainda limitada', 'Sua carteira possui duas categorias. Avalie se faz sentido incluir outras classes conforme seu perfil.', 'media');
  if (m.percentFixedIncome === 0) adicionar('melhoria', 'Ausencia de renda fixa', 'Voce nao possui ativos defensivos cadastrados. Renda fixa pode ajudar na estabilidade e liquidez da carteira.', 'media');
  if (m.percentVariableIncome >= 99.9) adicionar('melhoria', 'Carteira totalmente exposta a renda variavel', 'Sua carteira esta totalmente em ativos que podem oscilar mais. Avalie se isso esta alinhado ao seu perfil.', 'media');

  if (m.maxConcentrationPercent > 50) adicionar('alerta', 'Alta concentracao em um unico ativo', `O ativo ${m.topConcentrationAsset} representa mais de 50% da carteira. Isso pode deixar sua carteira dependente demais de um unico investimento.`, 'alta');
  else if (m.maxConcentrationPercent >= 35) adicionar('melhoria', 'Concentracao relevante', `O ativo ${m.topConcentrationAsset} representa uma parcela importante da carteira. Acompanhe para evitar excesso de concentracao.`, 'media');

  if (m.percentCrypto > 30) adicionar('alerta', 'Exposicao elevada em cripto', 'Criptomoedas sao ativos de alta volatilidade. Uma exposicao acima de 30% pode aumentar bastante o risco da carteira.', 'alta');
  if (perfilInvestidor?.perfil && ['Conservador severo', 'Conservador moderado'].includes(perfilInvestidor.perfil) && m.percentCrypto > 10) {
    adicionar('alerta', 'Cripto acima do recomendado para perfil conservador', 'Seu perfil indica maior cautela com risco, mas sua carteira possui exposicao relevante em criptomoedas.', 'alta');
  }
  if (perfilInvestidor?.perfil === 'Moderado' && m.percentCrypto > 20) {
    adicionar('melhoria', 'Cripto em nivel elevado para perfil moderado', 'Para um perfil moderado, pode ser interessante manter cripto em uma parcela mais controlada da carteira.', 'media');
  }

  if (m.percentHighRisk > 50) adicionar('alerta', 'Exposicao elevada a ativos de alto risco', 'Mais da metade da carteira esta em ativos de alto risco. Isso pode gerar oscilacoes maiores.', 'alta');
  if (perfilInvestidor?.perfil && ['Conservador severo', 'Conservador moderado'].includes(perfilInvestidor.perfil) && m.percentHighRisk > 25) {
    adicionar('alerta', 'Carteira desalinhada com perfil conservador', 'Seu perfil indica baixa tolerancia a risco, mas sua carteira possui alta exposicao a ativos arriscados.', 'alta');
  }
  if (perfilInvestidor?.perfil === 'Alto risco' && m.percentHighRisk < 20) {
    adicionar('informativo', 'Carteira mais defensiva que o seu perfil', 'Seu perfil aceita mais risco, mas sua carteira esta bastante defensiva. Isso nao e necessariamente ruim, mas pode limitar potencial de crescimento.', 'baixa');
  }

  if (m.percentDailyLiquidity < 20) adicionar('melhoria', 'Baixa liquidez', 'Pouca parte da carteira possui liquidez diaria. Ter uma parcela com resgate rapido pode ajudar em imprevistos.', 'media');
  if (perfilInvestidor?.perfil && ['Conservador severo', 'Conservador moderado'].includes(perfilInvestidor.perfil) && m.percentDailyLiquidity < 40) {
    adicionar('melhoria', 'Liquidez baixa para perfil conservador', 'Perfis conservadores geralmente se beneficiam de maior liquidez e previsibilidade.', 'media');
  }

  if (perfilInvestidor?.perfil === 'Conservador severo') adicionar('informativo', 'Direcao para perfil conservador severo', 'Priorize seguranca, liquidez e baixa volatilidade, evitando concentracao em ativos arriscados.', 'baixa');
  if (perfilInvestidor?.perfil === 'Conservador moderado') adicionar('informativo', 'Direcao para perfil conservador moderado', 'Busque equilibrio com predominancia de ativos defensivos e pequenas exposicoes em renda variavel.', 'baixa');
  if (perfilInvestidor?.perfil === 'Moderado') adicionar('informativo', 'Direcao para perfil moderado', 'Mantenha equilibrio entre renda fixa, FIIs e acoes, controlando concentracao por ativo.', 'baixa');
  if (perfilInvestidor?.perfil === 'Medio-alto risco') adicionar('informativo', 'Direcao para perfil medio-alto risco', 'Voce pode aceitar mais oscilacao, mas diversificacao continua essencial para reduzir risco especifico.', 'baixa');
  if (perfilInvestidor?.perfil === 'Alto risco') adicionar('informativo', 'Direcao para perfil alto risco', 'Maior exposicao a renda variavel pode fazer sentido, sem concentrar demais em um unico ativo ou em cripto.', 'baixa');

  const ordemPrioridade = { alta: 1, media: 2, baixa: 3 };
  return recomendacoes
    .sort((a, b) => (ordemPrioridade[a.prioridade] || 9) - (ordemPrioridade[b.prioridade] || 9))
    .slice(0, 5);
}

function obterBadgeRecomendacao(tipo) {
  if (tipo === 'alerta') return 'Alerta';
  if (tipo === 'melhoria') return 'Melhoria';
  if (tipo === 'positivo') return 'Positivo';
  return 'Info';
}

function obterConfigPrioridade(prioridade) {
  const nivel = String(prioridade || 'media').toLowerCase();
  if (nivel === 'alta') return { classe: 'priority-high', icone: '!', rotulo: 'Perigo' };
  if (nivel === 'baixa') return { classe: 'priority-low', icone: 'i', rotulo: 'Baixa' };
  return { classe: 'priority-medium', icone: '!', rotulo: 'Alerta' };
}

function renderizarRecomendacoes() {
  const list = document.getElementById('recommendationsList');
  try {
    const recomendacoes = gerarRecomendacoesAutomaticas(state.perfilInvestidor, state.assets, state.portfolioMetrics);
    if (!recomendacoes.length) {
      list.innerHTML = '<div class="recommendation-card recommendation-info priority-low"><div class="recommendation-icon">i</div><span class="recommendation-badge">Info</span><strong>Sem recomendacoes no momento</strong><p>Adicione mais dados para melhorar a analise automatica.</p><small>Prioridade: baixa</small></div>';
      return;
    }
    list.innerHTML = recomendacoes.map((item) => {
      const prioridade = obterConfigPrioridade(item.prioridade);
      return `
      <div class="recommendation-card recommendation-${item.tipo} ${prioridade.classe}">
        <div class="recommendation-icon" aria-label="${prioridade.rotulo}">${prioridade.icone}</div>
        <span class="recommendation-badge">${obterBadgeRecomendacao(item.tipo)}</span>
        <strong>${item.titulo}</strong>
        <p>${item.descricao}</p>
        <small>Prioridade: ${item.prioridade}</small>
      </div>
    `;
    }).join('');
  } catch (_error) {
    list.innerHTML = '<div class="recommendation-card recommendation-info priority-medium"><div class="recommendation-icon">!</div><span class="recommendation-badge">Info</span><strong>Recomendacoes indisponiveis</strong><p>Nao foi possivel gerar recomendacoes no momento.</p><small>Prioridade: media</small></div>';
  }
}

async function atualizarDashboardCarteira() {
  renderizarCarteira();

  if (state.assets.length === 0) {
    state.portfolioMetrics = null;
    renderizarMetricasCarteira();
    renderizarGraficosCarteira();
    renderizarRecomendacoes();
    atualizarResumoDashboard();
    return;
  }

  try {
    await calcularMetricasCarteira();
    renderizarMetricasCarteira();
    renderizarGraficosCarteira();
    renderizarRecomendacoes();
    atualizarResumoDashboard();
  } catch (_error) {
    renderizarGraficosCarteira();
    state.portfolioMetrics = null;
    renderizarMetricasCarteira();
    renderizarRecomendacoes();
    atualizarResumoDashboard();
  }
}

function salvarListaAtivosLocal(lista) {
  localStorage.setItem(STORAGE_KEY_FALLBACK, JSON.stringify(lista));
}

async function atualizarAtivoNoBackend(id, ativo) {
  try {
    const data = await requestApi(`/api/portfolio/assets/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ativo),
    });
    return data.asset;
  } catch (_error) {
    const assetsLocal = localStorage.getItem(STORAGE_KEY_FALLBACK);
    const lista = assetsLocal ? JSON.parse(assetsLocal) : state.assets;
    const atualizada = lista.map((asset) => (String(asset.id) === String(id) ? { ...ativo, id: String(id) } : asset));
    salvarListaAtivosLocal(atualizada);
    return { ...ativo, id: String(id) };
  }
}

async function adicionarAtivo(event) {
  event.preventDefault();
  const msg = document.getElementById('assetMessage');

  try {
    const categoria = document.getElementById('assetCategory').value;
    const ativo = montarAtivoPorCategoria(categoria);
    const erro = validarAtivoPorCategoria(categoria, ativo || {});

    if (erro) {
      setMessage(msg, erro, 'error');
      return;
    }

    if (ativoEmEdicaoIndex !== null) {
      const ativoOriginal = state.assets[ativoEmEdicaoIndex];
      const ativoAtualizado = { ...ativo, id: String(ativoOriginal.id) };
      const salvo = await atualizarAtivoNoBackend(ativoOriginal.id, ativoAtualizado);
      state.assets[ativoEmEdicaoIndex] = salvo;
      salvarListaAtivosLocal(state.assets);
      encerrarEdicaoAtivo();
      setMessage(msg, 'Ativo atualizado com sucesso.', 'success');
      renderizarCamposAtivoPorCategoria(categoria);
      await atualizarDashboardCarteira();
      abrirAbaDashboard('carteira');
      return;
    }

    const ativoSalvo = await salvarAtivoNoBackend(ativo);
    state.assets.push(ativoSalvo);
    salvarListaAtivosLocal(state.assets);

    setMessage(msg, 'Ativo adicionado a carteira com sucesso.', 'success');
    renderizarCamposAtivoPorCategoria(categoria);
    await atualizarDashboardCarteira();
  } catch (error) {
    setMessage(msg, error.message, 'error');
  }
}

document.getElementById('assetCategory').addEventListener('change', (event) => {
  renderizarCamposAtivoPorCategoria(event.target.value);
  document.querySelectorAll('.asset-type-card').forEach((card) => card.classList.toggle('active', card.dataset.assetCategory === event.target.value));
  setMessage(document.getElementById('assetMessage'), '');
});

document.getElementById('assetForm').addEventListener('submit', adicionarAtivo);

document.querySelectorAll('[data-jump-tab]').forEach((button) => {
  button.addEventListener('click', () => abrirAbaDashboard(button.dataset.jumpTab));
});

document.getElementById('goToAssetRegister')?.addEventListener('click', () => abrirAbaDashboard('ativos'));

document.querySelectorAll('[data-chart-view]').forEach((button) => {
  button.addEventListener('click', () => {
    state.concentrationChartView = button.dataset.chartView || 'bar';
    document.querySelectorAll('[data-chart-view]').forEach((item) => {
      item.classList.toggle('active', item.dataset.chartView === state.concentrationChartView);
    });
    renderizarGraficosCarteira();
  });
});

['contributionGranularity', 'contributionStartDate', 'contributionEndDate'].forEach((id) => {
  document.getElementById(id)?.addEventListener('change', renderizarGraficosCarteira);
});

document.getElementById('assetCancelEditBtn')?.addEventListener('click', () => {
  encerrarEdicaoAtivo();
  const categoria = document.getElementById('assetCategory').value;
  renderizarCamposAtivoPorCategoria(categoria);
  setMessage(document.getElementById('assetMessage'), 'Edicao cancelada.', 'success');
});

document.querySelectorAll('.asset-type-card').forEach((button) => {
  button.addEventListener('click', () => {
    const categoria = button.dataset.assetCategory;
    const select = document.getElementById('assetCategory');
    select.value = categoria;
    document.querySelectorAll('.asset-type-card').forEach((card) => card.classList.toggle('active', card === button));
    renderizarCamposAtivoPorCategoria(categoria);
    setMessage(document.getElementById('assetMessage'), '');
  });
});

document.addEventListener('click', (event) => {
  if (!event.target.closest('.custom-select')) fecharCustomSelectAberto();
});

document.getElementById('btnEditarPerfil')?.addEventListener('click', renderizarEditorPerfil);

document.getElementById('simulationForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const result = document.getElementById('simulationResult');
  const submitButton = event.currentTarget.querySelector('button[type="submit"]');

  const simulationGoal = document.getElementById('simulationGoal').value.trim();
  const targetAmount = Number(document.getElementById('targetAmount').value);
  const initialAmount = Number(document.getElementById('initialAmount').value);
  const recurringContribution = Number(document.getElementById('recurringContribution').value);
  const monthlyRatePercent = Number(document.getElementById('monthlyRatePercent').value);
  const months = Number(document.getElementById('months').value);

  if (!simulationGoal) return setMessage(result, 'Informe o objetivo da simulacao.', 'error');
  if (initialAmount < 0 || recurringContribution < 0 || monthlyRatePercent < 0 || targetAmount < 0 || months <= 0) {
    return setMessage(result, 'Valores invalidos na simulacao. Verifique os campos.', 'error');
  }

  result.className = 'simulation-loading';
  result.innerHTML = `
    <div class="simulation-loading-card">
      <div class="simulation-loading-top">
        <span class="section-kicker">Simulando</span>
        <strong>Aguarde enquanto calculamos sua projecao</strong>
      </div>
      <div class="simulation-loading-bar"><div></div></div>
      <p>Organizando aportes, juros e distancia ate o objetivo.</p>
    </div>
  `;
  if (submitButton) {
    submitButton.disabled = true;
    submitButton.textContent = 'Simulando...';
  }

  try {
    const data = await postData('/api/compound-interest', {
      initialAmount,
      recurringContribution,
      monthlyRatePercent,
      months,
      targetAmount,
    });

    result.className = 'simulation-result';
    const progresso = targetAmount > 0 ? Math.max(0, Math.min(100, (Number(data.finalAmount || 0) / targetAmount) * 100)) : 100;
    const statusClasse = data.reachedTarget ? 'simulation-status-ok' : 'simulation-status-warn';
    const mesesFormatados = `${months} ${months === 1 ? 'mes' : 'meses'}`;
    const diagnostico = data.reachedTarget
      ? 'A simulacao indica que o plano atual e suficiente para atingir o objetivo dentro do prazo informado.'
      : 'A simulacao indica que o objetivo ainda nao fecha com os parametros atuais. Revise aporte mensal, prazo ou taxa esperada.';
    result.innerHTML = `
      <div class="simulation-result-header">
        <div>
          <span class="section-kicker">Resultado projetado</span>
          <h3>${simulationGoal}</h3>
          <p>Horizonte de ${mesesFormatados} com taxa mensal de ${formatarPercentual(monthlyRatePercent)}.</p>
        </div>
        <span class="simulation-status ${statusClasse}">${data.reachedTarget ? 'Objetivo alcancado' : 'Ajuste necessario'}</span>
      </div>
      <div class="simulation-hero-number">
        <span>Resultado final estimado</span>
        <strong>${formatCurrency(data.finalAmount)}</strong>
      </div>
      <div class="simulation-progress">
        <div class="simulation-progress-top"><span>Progresso ate a meta</span><strong>${formatarPercentual(progresso)}</strong></div>
        <div class="simulation-progress-bar"><div style="width:${progresso}%"></div></div>
      </div>
      <div class="simulation-kpis">
        <div><span>Total aportado</span><strong>${formatCurrency(data.totalContributed)}</strong></div>
        <div><span>Rendimento estimado</span><strong>${formatCurrency(data.estimatedReturn)}</strong></div>
        <div><span>Diferenca para objetivo</span><strong>${formatCurrency(data.targetDifference)}</strong></div>
      </div>
      <div class="simulation-diagnosis ${statusClasse}">
        <span>Diagnostico</span>
        <strong>${data.reachedTarget ? 'Plano consistente' : 'Plano abaixo da meta'}</strong>
        <p>${diagnostico}</p>
      </div>
    `;
  } catch (error) {
    result.className = 'result-box error';
    setMessage(result, error.message, 'error');
  } finally {
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = 'Simular objetivo';
    }
  }
});

const perfilRestaurado = restaurarPerfilLocal();
if (perfilRestaurado) {
  renderizarPerfil();
  abrirDashboard();
} else {
  renderizarPerfil();
  iniciarQuestionarioPerfil();
}
renderizarCamposAtivoPorCategoria('');
transformarSelectsParaCustom(document.getElementById('assetForm'));
iniciarFundoInterativo();
iniciarDashboardTabs();

async function inicializarAplicacao() {
  try {
    await carregarAtivosSalvos();
    await atualizarDashboardCarteira();
  } catch (_error) {
    renderizarRecomendacoes();
    renderizarCarteira();
    renderizarMetricasCarteira();
    renderizarGraficosCarteira();
  }
}

inicializarAplicacao();



