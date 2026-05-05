const API_BASE_URL = 'http://localhost:3000';
const STORAGE_KEY_FALLBACK = 'fmpinvest_assets_local';

const state = {
  profileAnalysis: null,
  perfilInvestidor: null,
  assets: [],
  portfolioMetrics: null,
  recommendations: [],
};

const chartsCarteira = {
  categorias: null,
  rendaFixaVariavel: null,
  concentracao: null,
};

// A escala final (1 a 50) mede tolerancia ao risco, nao qualidade do investidor.
const PONTUACAO_BRUTA_MAXIMA = 47;

const perguntasPerfil = [
  {
    id: 'objetivo',
    pergunta: 'Qual e o seu principal objetivo financeiro?',
    opcoes: [
      { valor: 'Criar reserva de emergencia', pontos: 1 },
      { valor: 'Objetivo de curto prazo', pontos: 2 },
      { valor: 'Comprar imovel', pontos: 3 },
      { valor: 'Aposentadoria', pontos: 4 },
      { valor: 'Viver de renda', pontos: 4 },
      { valor: 'Crescimento patrimonial', pontos: 5 },
    ],
  },
  {
    id: 'horizonte',
    pergunta: 'Por quanto tempo voce pretende investir para esse objetivo?',
    opcoes: [
      { valor: 'Ate 1 ano', pontos: 1 },
      { valor: 'De 1 a 3 anos', pontos: 3 },
      { valor: 'De 3 a 5 anos', pontos: 5 },
      { valor: 'Mais de 5 anos', pontos: 7 },
    ],
  },
  {
    id: 'conhecimento',
    pergunta: 'Qual e o seu nivel de conhecimento sobre investimentos?',
    opcoes: [
      { valor: 'Iniciante', pontos: 1 },
      { valor: 'Intermediario', pontos: 4 },
      { valor: 'Avancado', pontos: 6 },
    ],
  },
  {
    id: 'reacaoPerda',
    pergunta: 'Como voce reagiria se seus investimentos caissem 10% em um mes?',
    opcoes: [
      { valor: 'Venderia para evitar perdas maiores', pontos: 1 },
      { valor: 'Ficaria preocupado, mas manteria', pontos: 5 },
      { valor: 'Manteria e talvez compraria mais', pontos: 8 },
    ],
  },
  {
    id: 'percentualRenda',
    pergunta: 'Quanto da sua renda mensal voce consegue investir?',
    opcoes: [
      { valor: 'Menos de 5%', pontos: 1 },
      { valor: 'De 5% a 10%', pontos: 3 },
      { valor: 'De 10% a 20%', pontos: 4 },
      { valor: 'Mais de 20%', pontos: 5 },
    ],
  },
  {
    id: 'reserva',
    pergunta: 'Voce ja possui reserva de emergencia?',
    opcoes: [
      { valor: 'Nao tenho', pontos: -3 },
      { valor: 'Tenho parcialmente', pontos: 0 },
      { valor: 'Sim, tenho pelo menos 6 meses de gastos', pontos: 2 },
    ],
  },
  {
    id: 'liquidez',
    pergunta: 'Qual sua preferencia de liquidez?',
    opcoes: [
      { valor: 'Quero poder resgatar rapido', pontos: 1 },
      { valor: 'Posso deixar parte investida por algum tempo', pontos: 4 },
      { valor: 'Posso deixar investido por varios anos', pontos: 7 },
    ],
  },
  {
    id: 'confortoAtivo',
    pergunta: 'Qual tipo de investimento voce se sente mais confortavel em usar?',
    multipla: true,
    opcoes: [
      { valor: 'Renda fixa', pontos: 1 },
      { valor: 'Fundos imobiliarios', pontos: 3 },
      { valor: 'Acoes', pontos: 5 },
      { valor: 'Cripto', pontos: 7 },
      { valor: 'Ainda nao sei', pontos: 1 },
    ],
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
  const descricaoPontuacao = obterDescricaoPontuacaoPerfil(p.pontuacao);
  const descricaoPerfil = obterDescricaoPerfil(p.perfil);

  box.innerHTML = `
    <div class="perfil-resultado-card">
      <h3>Seu perfil de investidor</h3>
      <div class="perfil-resultado-nome">${p.perfil}</div>
      <div class="perfil-resultado-pontos">${p.pontuacao}/50</div>
      <p class="perfil-resultado-texto">${descricaoPontuacao}</p>
      <p class="perfil-resultado-texto">A pontuacao considera comportamento diante de risco, horizonte, liquidez, conhecimento e preferencias de investimento.</p>
      <p class="perfil-resultado-texto">${descricaoPerfil}</p>
      <div class="perfil-escala">
        <strong>Escala de perfil:</strong>
        <ul>
          <li>1 a 10: Conservador severo</li>
          <li>11 a 20: Conservador moderado</li>
          <li>21 a 30: Moderado</li>
          <li>31 a 40: Medio-alto risco</li>
          <li>41 a 50: Alto risco</li>
        </ul>
      </div>
    </div>
  `;
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

  container.innerHTML = `
    <div class="perfil-card-interno">
      <h3>Perfil do Investidor</h3>
      <p>Responda em menos de 2 minutos para receber uma sugestao de perfil e primeiros passos.</p>
      <div class="perfil-topo">
        <span>Pergunta ${indicePerguntaAtual + 1} de ${totalPerguntas}</span>
        <span>${progresso}%</span>
      </div>
      <div class="perfil-barra"><div class="perfil-barra-fill" style="width:${progresso}%"></div></div>
      <h4>${perguntaAtual.pergunta}</h4>
      ${perguntaAtual.multipla ? '<p>Voce pode selecionar mais de uma opcao.</p>' : ''}
      <div class="perfil-opcoes">
        ${perguntaAtual.opcoes.map((opcao) => `
          <button
            type="button"
            class="perfil-opcao ${perguntaAtual.multipla ? ((respostaSelecionada || []).includes(opcao.valor) ? 'selecionada' : '') : (respostaSelecionada === opcao.valor ? 'selecionada' : '')}"
            data-valor="${opcao.valor}"
          >${opcao.valor}</button>
        `).join('')}
      </div>
      <div class="perfil-acoes">
        <button type="button" class="secundario" id="btnVoltarPerfil" ${indicePerguntaAtual === 0 ? 'disabled' : ''}>Voltar</button>
        <button type="button" id="btnProximoPerfil">Proximo</button>
      </div>
    </div>
  `;

  container.querySelectorAll('.perfil-opcao').forEach((botao) => {
    botao.addEventListener('click', () => selecionarRespostaPerfil(botao.dataset.valor));
  });
  container.querySelector('#btnVoltarPerfil').addEventListener('click', voltarPerguntaPerfil);
  container.querySelector('#btnProximoPerfil').addEventListener('click', avancarPerguntaPerfil);
}

function selecionarRespostaPerfil(resposta) {
  const perguntaAtual = perguntasPerfil[indicePerguntaAtual];
  if (!perguntaAtual.multipla) {
    respostasPerfil[perguntaAtual.id] = resposta;
    renderizarPerguntaPerfil();
    return;
  }

  const opcaoEspecial = 'Ainda nao sei';
  const respostaAtual = Array.isArray(respostasPerfil[perguntaAtual.id]) ? [...respostasPerfil[perguntaAtual.id]] : [];

  if (resposta === opcaoEspecial) {
    respostasPerfil[perguntaAtual.id] = [opcaoEspecial];
    renderizarPerguntaPerfil();
    return;
  }

  let novaSelecao = respostaAtual.filter((item) => item !== opcaoEspecial);
  if (novaSelecao.includes(resposta)) {
    novaSelecao = novaSelecao.filter((item) => item !== resposta);
  } else {
    novaSelecao.push(resposta);
  }
  respostasPerfil[perguntaAtual.id] = novaSelecao;
  renderizarPerguntaPerfil();
}

function avancarPerguntaPerfil() {
  const perguntaAtual = perguntasPerfil[indicePerguntaAtual];
  const respostaAtual = respostasPerfil[perguntaAtual.id];
  const respostaValida = perguntaAtual.multipla ? Array.isArray(respostaAtual) && respostaAtual.length > 0 : Boolean(respostaAtual);
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

function calcularResultadoPerfil() {
  let pontuacaoBruta = 0;
  perguntasPerfil.forEach((pergunta) => {
    const selecionada = respostasPerfil[pergunta.id];
    if (pergunta.multipla) {
      const selecionadas = Array.isArray(selecionada) ? selecionada : [];
      const pontosSelecionados = selecionadas
        .map((valor) => pergunta.opcoes.find((item) => item.valor === valor)?.pontos)
        .filter((pontos) => Number.isFinite(pontos));
      const media = pontosSelecionados.length ? pontosSelecionados.reduce((soma, pontos) => soma + pontos, 0) / pontosSelecionados.length : 0;
      pontuacaoBruta += media;
      return;
    }
    const opcao = pergunta.opcoes.find((item) => item.valor === selecionada);
    pontuacaoBruta += opcao ? opcao.pontos : 0;
  });

  const pontuacaoFinal = Math.round((pontuacaoBruta / PONTUACAO_BRUTA_MAXIMA) * 50);
  const pontuacao = Math.max(1, Math.min(50, pontuacaoFinal));

  let perfil = 'Moderado';
  if (pontuacao <= 10) perfil = 'Conservador severo';
  else if (pontuacao <= 20) perfil = 'Conservador moderado';
  else if (pontuacao <= 30) perfil = 'Moderado';
  else if (pontuacao <= 40) perfil = 'Medio-alto risco';
  else perfil = 'Alto risco';

  const resumoPorPerfil = {
    'Conservador severo': 'Seu perfil indica alta cautela com risco e preferencia por seguranca.',
    'Conservador moderado': 'Seu perfil aceita algum risco, mas ainda precisa de equilibrio e liquidez.',
    Moderado: 'Seu perfil demonstra tolerancia intermediaria a oscilacoes.',
    'Medio-alto risco': 'Seu perfil aceita maior volatilidade em busca de retorno.',
    'Alto risco': 'Seu perfil possui alta tolerancia a risco, mas ainda precisa de controle de concentracao.',
  };

  const recomendacoesPorPerfil = {
    'Conservador severo': [
      'Mantenha alta exposicao em renda fixa e liquidez.',
      'Evite cripto neste momento.',
      'Evite carteira com muitos ativos de alto risco.',
    ],
    'Conservador moderado': [
      'Mantenha boa parte da carteira em renda fixa.',
      'Pode ter pequena exposicao em FIIs e acoes.',
      'Cripto deve ser muito limitada.',
    ],
    Moderado: [
      'Busque equilibrio entre renda fixa, FIIs e acoes.',
      'Mantenha exposicao pequena e controlada a cripto.',
      'Evite concentracao excessiva em poucos ativos.',
    ],
    'Medio-alto risco': [
      'Pode manter maior peso em acoes e FIIs.',
      'Cripto pode entrar com exposicao controlada.',
      'Evite concentracao em um unico ativo.',
    ],
    'Alto risco': [
      'Aceita maior exposicao a acoes e cripto.',
      'Diversificacao continua obrigatoria.',
      'Carteira 100% em um unico ativo continua inadequada.',
    ],
  };

  return {
    objetivo: respostasPerfil.objetivo,
    horizonte: respostasPerfil.horizonte,
    conhecimento: respostasPerfil.conhecimento,
    pontuacao,
    perfil,
    resumo: resumoPorPerfil[perfil],
    recomendacoes: recomendacoesPorPerfil[perfil],
  };
}

function mapearPerfilAtualParaPerfilLegado(perfilAtual) {
  if (perfilAtual === 'Conservador severo' || perfilAtual === 'Conservador moderado') return 'Conservador';
  if (perfilAtual === 'Moderado') return 'Moderado';
  return 'Arrojado';
}

function renderizarFimQuestionarioPerfil() {
  const container = document.getElementById('profileQuestionnaire');
  container.innerHTML = `
    <div class="perfil-card-interno">
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
        <button type="button" class="secundario" id="btnEditarPerfil">Voltar</button>
        <button type="button" id="btnVerPerfil">Ver meu perfil</button>
      </div>
    </div>
  `;
  container.querySelector('#btnEditarPerfil').addEventListener('click', () => {
    indicePerguntaAtual = perguntasPerfil.length - 1;
    renderizarPerguntaPerfil();
  });
  container.querySelector('#btnVerPerfil').addEventListener('click', async () => {
    state.perfilInvestidor = calcularResultadoPerfil();
    state.profileAnalysis = { investorProfile: mapearPerfilAtualParaPerfilLegado(state.perfilInvestidor.perfil) };
    window.perfilInvestidor = state.perfilInvestidor;
    renderizarResultadoPerfil();
    await atualizarDashboardCarteira();
  });
}

function renderizarResultadoPerfil() {
  renderizarPerfil();
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
    return;
  }

  if (categoria === 'renda fixa') {
    renderizarCamposRendaFixa(container);
    return;
  }

  if (categoria === 'cripto') {
    renderizarCamposCripto(container);
    return;
  }

  if (categoria === 'fundos imobiliarios') {
    renderizarCamposFiis(container);
  }
}

function renderizarCamposFiis(container) {
  const hoje = new Date().toISOString().split('T')[0];
  container.innerHTML = `
    <label>Tipo de operacao
      <select id="assetOperation" required>
        <option value="compra">Compra</option>
        <option value="venda" disabled>Venda (em breve)</option>
      </select>
    </label>
    <label>Tipo de ativo
      <select id="assetFiiAssetType" required>
        <option value="fundos imobiliarios">Fundos Imobiliarios</option>
      </select>
    </label>
    <label>Fundo imobiliario
      <select id="assetFiiTicker" required>
        <option value="">Selecione</option><option value="MXRF11">MXRF11</option><option value="HGLG11">HGLG11</option><option value="KNRI11">KNRI11</option><option value="XPML11">XPML11</option><option value="VISC11">VISC11</option><option value="BCFF11">BCFF11</option><option value="XPLG11">XPLG11</option><option value="HGRU11">HGRU11</option><option value="KNSC11">KNSC11</option><option value="Outra">Outra</option>
      </select>
    </label>
    <label id="assetFiiCustomNameWrapper" style="display:none;">Nome do fundo
      <input id="assetFiiCustomName" type="text" placeholder="Digite o nome do fundo" />
    </label>
    <label>Data da compra
      <input id="assetPurchaseDate" type="date" value="${hoje}" required />
    </label>
    <label>Quantidade de cotas
      <input id="assetQuantity" type="number" min="1" step="1" required />
    </label>
    <label>Preco em R$
      <input id="assetUnitPrice" type="number" min="0.01" step="0.01" required />
    </label>
    <label>Outros custos (R$)
      <input id="assetOtherCosts" type="number" min="0" step="0.01" value="0" />
    </label>
    <label>Valor total
      <input id="assetTotalValueDisplay" type="text" value="${formatCurrency(0)}" disabled />
      <input id="assetValue" type="hidden" value="0" />
    </label>
    <label>Tipo de FII
      <select id="assetFiiType" required>
        <option value="">Selecione</option><option value="papel">Papel</option><option value="tijolo">Tijolo</option><option value="hibrido">Hibrido</option><option value="fundo de fundos">Fundo de fundos</option><option value="desenvolvimento">Desenvolvimento</option><option value="outro">Outro</option>
      </select>
    </label>
    <label>Segmento
      <select id="assetSegment" required>
        <option value="">Selecione</option><option value="recebiveis">Recebiveis</option><option value="logistica">Logistica</option><option value="shopping">Shopping</option><option value="lajes corporativas">Lajes corporativas</option><option value="galpoes">Galpoes</option><option value="renda urbana">Renda urbana</option><option value="hibrido">Hibrido</option><option value="fundo de fundos">Fundo de fundos</option><option value="outros">Outros</option>
      </select>
    </label>
    <label>Dividend yield mensal estimado (%)
      <input id="assetDyMonthly" type="text" placeholder="Ex: 0,8" />
    </label>
    <label>Objetivo do ativo
      <select id="assetObjective" required>
        <option value="">Selecione</option><option value="renda mensal">Renda mensal</option><option value="diversificacao">Diversificacao</option><option value="longo prazo">Longo prazo</option><option value="especulacao">Especulacao</option>
      </select>
    </label>
    <label>Nivel de risco
      <input id="assetRiskDisplay" type="text" value="Medio" disabled />
      <input id="assetRisk" type="hidden" value="medio" />
    </label>
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
      <input id="assetIssuer" type="text" placeholder="Ex: Banco Inter, Tesouro Nacional, BTG Pactual" required />
      <small class="field-help">Use o nome que voce reconhece na sua corretora ou banco.</small>
    </label>
    <label>Nome do titulo
      <input id="assetName" type="text" placeholder="Ex: CDB Banco Inter 110% CDI" required />
    </label>
    <label>Indexador
      <select id="assetIndexer" required>
        <option value="">Selecione</option><option value="cdi">CDI</option><option value="cdi+">CDI+</option><option value="ipca+">IPCA+</option><option value="prefixado">Prefixado</option><option value="selic">Selic</option><option value="outro">Outro</option>
      </select>
    </label>
    <div id="assetYieldDynamicFields" class="dynamic-fields"></div>
    <label>Forma
      <select id="assetForm" required>
        <option value="">Selecione</option><option value="pos-fixado">Pos-fixado</option><option value="prefixado">Prefixado</option><option value="hibrido">Hibrido</option>
      </select>
    </label>
    <label>Valor investido (R$)
      <input id="assetValue" type="number" min="0.01" step="0.01" required />
      <small class="field-help">Informe quanto voce possui aplicado nesse ativo.</small>
    </label>
    <label>Data da compra
      <input id="assetPurchaseDate" type="date" value="${hoje}" required />
    </label>
    <label>Liquidez diaria
      <input id="assetDailyLiquidity" type="checkbox" />
    </label>
    <label>Data de vencimento
      <input id="assetMaturity" type="date" required />
    </label>
    <label>Garantia FGC
      <select id="assetFGC" required>
        <option value="">Selecione</option><option value="sim">Sim</option><option value="nao">Nao</option><option value="nao se aplica">Nao se aplica</option>
      </select>
    </label>
    <label>Nivel de risco (automatico)
      <input id="assetRiskDisplay" type="text" disabled />
      <input id="assetRisk" type="hidden" />
    </label>
    <label>Valor total (resumo)
      <input id="assetTotalValueDisplay" type="text" value="${formatCurrency(0)}" disabled />
    </label>
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
    <label>Tipo de operacao
      <select id="assetOperation" required>
        <option value="compra">Compra</option>
        <option value="venda" disabled>Venda (em breve)</option>
      </select>
    </label>
    <label>Tipo de ativo
      <select id="assetStockType" required>
        <option value="acoes">Acoes</option>
      </select>
    </label>
    <label>Ativo
      <select id="assetTicker" required>
        <option value="">Selecione</option><option value="PETR4">PETR4</option><option value="VALE3">VALE3</option><option value="ITUB4">ITUB4</option><option value="BBAS3">BBAS3</option><option value="WEGE3">WEGE3</option><option value="BBDC4">BBDC4</option><option value="ABEV3">ABEV3</option><option value="MGLU3">MGLU3</option><option value="Outra">Outra</option>
      </select>
    </label>
    <label id="assetStockCustomNameWrapper" style="display:none;">Nome da acao / empresa
      <input id="assetStockCustomName" type="text" placeholder="Digite o nome da acao ou empresa" />
    </label>
    <label>Data da compra
      <input id="assetPurchaseDate" type="date" value="${hoje}" required />
    </label>
    <label>Quantidade
      <input id="assetQuantity" type="number" min="1" step="1" required />
    </label>
    <label>Preco em R$
      <input id="assetUnitPrice" type="number" min="0.01" step="0.01" required />
    </label>
    <label>Outros custos (R$)
      <input id="assetOtherCosts" type="number" min="0" step="0.01" value="0" />
    </label>
    <label>Valor total
      <input id="assetTotalValueDisplay" type="text" value="${formatCurrency(0)}" disabled />
      <input id="assetValue" type="hidden" value="0" />
    </label>
    <label>Objetivo do ativo
      <select id="assetObjective" required>
        <option value="">Selecione</option><option value="dividendos">Dividendos</option><option value="crescimento">Crescimento</option><option value="longo prazo">Longo prazo</option><option value="especulacao">Especulacao</option>
      </select>
    </label>
    <label>Setor
      <select id="assetSector" required>
        <option value="">Selecione</option><option value="bancos">Bancos</option><option value="energia">Energia</option><option value="commodities">Commodities</option><option value="consumo">Consumo</option><option value="tecnologia">Tecnologia</option><option value="varejo">Varejo</option><option value="saude">Saude</option><option value="industrial">Industrial</option><option value="outros">Outros</option>
      </select>
    </label>
    <label>Nivel de risco
      <input id="assetRiskDisplay" type="text" value="Medio" disabled />
      <input id="assetRisk" type="hidden" value="medio" />
    </label>
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
    <label>Tipo de operacao
      <select id="assetOperation" required>
        <option value="compra">Compra</option>
        <option value="venda" disabled>Venda (em breve)</option>
      </select>
    </label>
    <label>Tipo de ativo
      <select id="assetCryptoType" required>
        <option value="criptomoedas">Criptomoedas</option>
      </select>
    </label>
    <label>Ativo
      <select id="assetCryptoName" required>
        <option value="">Selecione</option><option value="Bitcoin">Bitcoin</option><option value="Ethereum">Ethereum</option><option value="Solana">Solana</option><option value="BNB">BNB</option><option value="XRP">XRP</option><option value="Cardano">Cardano</option><option value="Dogecoin">Dogecoin</option><option value="Outra">Outra</option>
      </select>
    </label>
    <label id="assetCryptoCustomNameWrapper" style="display:none;">Nome da criptomoeda
      <input id="assetCryptoCustomName" type="text" placeholder="Digite o nome da criptomoeda" />
    </label>
    <label>Data da compra
      <input id="assetPurchaseDate" type="date" value="${hoje}" required />
    </label>
    <label>Quantidade
      <input id="assetQuantity" type="number" min="0.00000001" step="0.00000001" required />
    </label>
    <label>Preco em R$
      <input id="assetUnitPrice" type="number" min="0.01" step="0.01" required />
    </label>
    <label>Outros custos (R$)
      <input id="assetOtherCosts" type="number" min="0" step="0.01" value="0" />
    </label>
    <label>Valor total
      <input id="assetTotalValueDisplay" type="text" value="${formatCurrency(0)}" disabled />
      <input id="assetValue" type="hidden" value="0" />
    </label>
    <label>Objetivo do ativo
      <select id="assetObjective" required>
        <option value="">Selecione</option><option value="reserva de valor">Reserva de valor</option><option value="longo prazo">Longo prazo</option><option value="especulacao">Especulacao</option>
      </select>
    </label>
    <label>Nivel de risco
      <input id="assetRiskDisplay" type="text" value="Alto" disabled />
      <input id="assetRisk" type="hidden" value="alto" />
    </label>
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
  if (asset.category === 'acoes') {
    return formatarDetalhesAcoes(asset);
  }
  if (asset.category === 'renda fixa') {
    const compra = asset.purchaseDate ? new Date(`${asset.purchaseDate}T00:00:00`).toLocaleDateString('pt-BR') : '-';
    const vencimento = asset.maturityDate && asset.maturityDate !== 'Sem vencimento'
      ? new Date(`${asset.maturityDate}T00:00:00`).toLocaleDateString('pt-BR')
      : 'Sem vencimento';
    return `Tipo: ${asset.fixedIncomeType || asset.titleType}<br>Emissor: ${asset.issuer || '-'}<br>Indexador: ${asset.indexer || '-'}<br>Rentabilidade: ${asset.yieldInfo}<br>Forma: ${asset.form || '-'}<br>Liquidez: ${asset.liquidity === 'diaria' ? 'Diaria' : 'No vencimento'}<br>Vencimento: ${vencimento}<br>FGC: ${asset.fgc}<br>Compra: ${compra}`;
  }
  if (asset.category === 'cripto') {
    return formatarDetalhesCripto(asset);
  }
  if (asset.category === 'fundos imobiliarios') {
    return formatarDetalhesFiis(asset);
  }
  return '-';
}

function obterPerfilAtivoTabela(asset) {
  if (asset.category === 'acoes') return asset.objective || '-';
  if (asset.category === 'renda fixa') return asset.titleType || '-';
  if (asset.category === 'cripto') return asset.objective || '-';
  if (asset.category === 'fundos imobiliarios') return asset.objective || asset.fiiType || '-';
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

function renderizarCarteira() {
  const body = document.getElementById('portfolioTableBody');

  if (state.assets.length === 0) {
    body.innerHTML = '<tr><td colspan="7" class="empty-row">Nenhum ativo cadastrado. Escolha uma categoria e adicione seu primeiro ativo.</td></tr>';
    return;
  }

  body.innerHTML = state.assets.map((asset, index) => {
    return `
      <tr>
        <td>${formatarCategoriaAtivo(asset.category)}</td>
        <td>${asset.name}</td>
        <td>${formatCurrency(asset.value)}</td>
        <td>${obterPerfilAtivoTabela(asset)}</td>
        <td>${asset.risk}</td>
        <td class="asset-details">${dadosPrincipaisAtivo(asset)}</td>
        <td><button class="remove-btn" data-index="${index}">Remover</button></td>
      </tr>
    `;
  }).join('');

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
  grid.innerHTML = `
    <h3 class="metric-block-title">Resumo principal</h3>
    <div class="metric-main-grid">
      <div class="metric-main-item"><strong>Valor total investido</strong><span class="metric-value">${formatCurrency(m.totalInvested)}</span></div>
      <div class="metric-main-item"><strong>Quantidade de ativos</strong><span class="metric-value">${m.assetsCount}</span></div>
      <div class="metric-main-item"><strong>Quantidade de categorias</strong><span class="metric-value">${m.typesCount}</span></div>
      <div class="metric-main-item score-item">
        <strong>Score da carteira</strong>
        <span class="metric-value">${score}/100</span>
        <div class="score-label">${scoreLabel}</div>
        <div class="score-diagnostico">${scoreDiagnostico}</div>
        <div class="score-bar"><div class="score-bar-fill" style="width:${Math.max(0, Math.min(100, score))}%"></div></div>
      </div>
    </div>
    <h3 class="metric-block-title">Indicadores complementares</h3>
    <div class="metric-secondary-grid">
      <div class="metric-item"><strong>Maior concentracao</strong><span class="metric-value">${m.maxConcentrationPercent.toFixed(2)}%</span></div>
      <div class="metric-item"><strong>Ativo mais concentrado</strong><span class="metric-value">${m.topConcentrationAsset}</span></div>
      <div class="metric-item"><strong>% em renda fixa</strong><span class="metric-value">${m.percentFixedIncome.toFixed(2)}%</span></div>
      <div class="metric-item"><strong>% em renda variavel</strong><span class="metric-value">${m.percentVariableIncome.toFixed(2)}%</span></div>
      <div class="metric-item"><strong>% em risco alto</strong><span class="metric-value">${m.percentHighRisk.toFixed(2)}%</span></div>
      <div class="metric-item"><strong>% em liquidez diaria</strong><span class="metric-value">${m.percentDailyLiquidity.toFixed(2)}%</span></div>
      <div class="metric-item"><strong>Diversificacao</strong><span class="metric-value">${m.diversification}</span></div>
      <div class="metric-item"><strong>Risco geral</strong><span class="metric-value">${m.riskClassification}</span></div>
    </div>
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

function destruirGraficosCarteira() {
  Object.keys(chartsCarteira).forEach((key) => {
    if (chartsCarteira[key]) {
      chartsCarteira[key].destroy();
      chartsCarteira[key] = null;
    }
  });
}

function renderizarGraficosCarteira() {
  const categoriasCanvas = document.getElementById('chartCategorias');
  const rendaFixaVariavelCanvas = document.getElementById('chartRendaFixaVariavel');
  const concentracaoCanvas = document.getElementById('chartConcentracao');

  if (!categoriasCanvas || !rendaFixaVariavelCanvas || !concentracaoCanvas) return;

  destruirGraficosCarteira();

  if (!state.assets.length || typeof Chart === 'undefined') return;

  const dadosCategorias = obterDadosGraficoCategorias();
  const dadosRendaFixaVariavel = obterDadosGraficoRendaFixaVariavel();
  const dadosConcentracao = obterDadosGraficoConcentracao();

  chartsCarteira.categorias = new Chart(categoriasCanvas, {
    type: 'doughnut',
    data: {
      labels: dadosCategorias.labels,
      datasets: [{ data: dadosCategorias.data, backgroundColor: ['#1E3A5F', '#3E6B89', '#8AA1B1', '#6FA58B'], borderWidth: 1, borderColor: '#f7f9fb' }],
    },
    options: {
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { boxWidth: 12, color: '#4a5a6b' } },
        tooltip: {
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
      datasets: [{ data: dadosRendaFixaVariavel.data, backgroundColor: ['#6FA58B', '#3E6B89'], borderWidth: 1, borderColor: '#f7f9fb' }],
    },
    options: {
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { boxWidth: 12, color: '#4a5a6b' } },
        tooltip: {
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

  chartsCarteira.concentracao = new Chart(concentracaoCanvas, {
    type: 'bar',
    data: {
      labels: dadosConcentracao.labels,
      datasets: [{ label: '% da carteira', data: dadosConcentracao.percentuais, backgroundColor: ['#1E3A5F', '#2B4D6A', '#3E6B89', '#5B819B', '#6E90A7', '#8AA1B1', '#9EB2BF', '#B1C2CB', '#C3D1D8', '#D6E1E6'] }],
    },
    options: {
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
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
      scales: {
        x: { ticks: { color: '#4a5a6b' }, grid: { display: false } },
        y: { beginAtZero: true, ticks: { callback: (value) => formatarPercentual(value), color: '#4a5a6b' }, grid: { color: '#e7edf2' } },
      },
    },
  });
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

function renderizarRecomendacoes() {
  const list = document.getElementById('recommendationsList');
  try {
    const recomendacoes = gerarRecomendacoesAutomaticas(state.perfilInvestidor, state.assets, state.portfolioMetrics);
    if (!recomendacoes.length) {
      list.innerHTML = '<div class="recommendation-card recommendation-info"><span class="recommendation-badge">Info</span><strong>Sem recomendacoes no momento</strong><p>Adicione mais dados para melhorar a analise automatica.</p><small>Prioridade: baixa</small></div>';
      return;
    }
    list.innerHTML = recomendacoes.map((item) => `
      <div class="recommendation-card recommendation-${item.tipo}">
        <span class="recommendation-badge">${obterBadgeRecomendacao(item.tipo)}</span>
        <strong>${item.titulo}</strong>
        <p>${item.descricao}</p>
        <small>Prioridade: ${item.prioridade}</small>
      </div>
    `).join('');
  } catch (_error) {
    list.innerHTML = '<div class="recommendation-card recommendation-info"><span class="recommendation-badge">Info</span><strong>Recomendacoes indisponiveis</strong><p>Nao foi possivel gerar recomendacoes no momento.</p><small>Prioridade: media</small></div>';
  }
}

async function atualizarDashboardCarteira() {
  renderizarCarteira();

  if (state.assets.length === 0) {
    state.portfolioMetrics = null;
    renderizarMetricasCarteira();
    renderizarGraficosCarteira();
    renderizarRecomendacoes();
    return;
  }

  try {
    await calcularMetricasCarteira();
    renderizarMetricasCarteira();
    renderizarGraficosCarteira();
    renderizarRecomendacoes();
  } catch (_error) {
    renderizarGraficosCarteira();
    state.portfolioMetrics = null;
    renderizarMetricasCarteira();
    renderizarRecomendacoes();
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

    const ativoSalvo = (categoria === 'cripto' || categoria === 'acoes' || categoria === 'fundos imobiliarios') ? ativo : await salvarAtivoNoBackend(ativo);
    state.assets.push(ativoSalvo);

    if (categoria === 'cripto' || categoria === 'acoes' || categoria === 'fundos imobiliarios') {
      const assetsLocal = localStorage.getItem(STORAGE_KEY_FALLBACK);
      const lista = assetsLocal ? JSON.parse(assetsLocal) : [];
      lista.push(ativoSalvo);
      localStorage.setItem(STORAGE_KEY_FALLBACK, JSON.stringify(lista));
    }

    setMessage(msg, 'Ativo adicionado a carteira com sucesso.', 'success');
    renderizarCamposAtivoPorCategoria(categoria);
    await atualizarDashboardCarteira();
  } catch (error) {
    setMessage(msg, error.message, 'error');
  }
}

document.getElementById('assetCategory').addEventListener('change', (event) => {
  renderizarCamposAtivoPorCategoria(event.target.value);
  setMessage(document.getElementById('assetMessage'), '');
});

document.getElementById('assetForm').addEventListener('submit', adicionarAtivo);

document.getElementById('simulationForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const result = document.getElementById('simulationResult');

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

  try {
    const data = await postData('/api/compound-interest', {
      initialAmount,
      recurringContribution,
      monthlyRatePercent,
      months,
      targetAmount,
    });

    result.classList.remove('error');
    result.innerHTML = `
      <p><strong>Objetivo:</strong> ${simulationGoal}</p>
      <p><strong>Resultado final estimado:</strong> ${formatCurrency(data.finalAmount)}</p>
      <p><strong>Total aportado:</strong> ${formatCurrency(data.totalContributed)}</p>
      <p><strong>Rendimento estimado:</strong> ${formatCurrency(data.estimatedReturn)}</p>
      <p><strong>Diferenca para objetivo:</strong> ${formatCurrency(data.targetDifference)}</p>
      <p><strong>Status:</strong> ${data.reachedTarget ? 'Voce alcanca o objetivo nesta simulacao.' : 'Objetivo ainda nao alcancado; ajuste aporte, prazo ou taxa.'}</p>
    `;
  } catch (error) {
    setMessage(result, error.message, 'error');
  }
});

renderizarPerfil();
iniciarQuestionarioPerfil();
renderizarCamposAtivoPorCategoria('');

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



