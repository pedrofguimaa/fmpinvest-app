const API_BASE_URL = 'http://localhost:3000';

const state = {
  profileAnalysis: null,
  assets: [],
  portfolioMetrics: null,
  recommendations: [],
};

function formatCurrency(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function setMessage(element, message, type = '') {
  element.textContent = message;
  element.classList.remove('success', 'error');
  if (type) element.classList.add(type);
}

async function postData(endpoint, payload) {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const text = await response.text();
    throw new Error(`Resposta invalida da API (${response.status}). Recebido: ${text.slice(0, 30)}...`);
  }

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Erro na requisicao.');
  return data;
}

function coletarDadosPerfil() {
  return {
    userName: document.getElementById('userName').value.trim(),
    age: Number(document.getElementById('age').value),
    monthlyIncome: Number(document.getElementById('monthlyIncome').value),
    monthlyExpense: Number(document.getElementById('monthlyExpense').value),
    monthlyContribution: Number(document.getElementById('monthlyContribution').value),
    emergencyReserveAmount: Number(document.getElementById('emergencyReserveAmount').value),
    mainGoal: document.getElementById('mainGoal').value,
    goalMonths: Number(document.getElementById('goalMonths').value),
    knowledgeLevel: document.getElementById('knowledgeLevel').value,
    riskTolerance: document.getElementById('riskTolerance').value,
    investmentHorizon: document.getElementById('investmentHorizon').value,
    hasEmergencyReserve: document.getElementById('hasEmergencyReserve').value,
    liquidityPreference: document.getElementById('liquidityPreference').value,
  };
}

function renderizarPerfil() {
  const box = document.getElementById('profileResult');
  if (!state.profileAnalysis) {
    box.innerHTML = '<p>Preencha os dados para gerar sua analise inicial.</p>';
    return;
  }

  const p = state.profileAnalysis;
  box.innerHTML = `
    <p><strong>Taxa de investimento:</strong> ${p.investmentRate.toFixed(2)}%</p>
    <p><strong>Renda disponivel estimada:</strong> ${formatCurrency(p.availableIncome)}</p>
    <p><strong>Percentual de gastos sobre renda:</strong> ${p.expenseRate.toFixed(2)}%</p>
    <p><strong>Perfil sugerido:</strong> ${p.investorProfile}</p>
    <p><strong>Status da reserva:</strong> ${p.emergencyReserveStatus} (${p.emergencyReserveMonths} meses)</p>
    <p><strong>Diagnostico:</strong> ${p.diagnosis.join(' ')}</p>
  `;
}

function renderizarCamposAtivoPorCategoria(categoria) {
  const container = document.getElementById('assetDynamicFields');

  if (!categoria) {
    container.innerHTML = '';
    return;
  }

  if (categoria === 'acoes') {
    container.innerHTML = `
      <label>Nome da empresa<input id="assetName" type="text" required /></label>
      <label>Codigo/Ticker<input id="assetTicker" type="text" required /></label>
      <label>Setor
        <select id="assetSector" required>
          <option value="">Selecione</option><option value="bancos">Bancos</option><option value="energia">Energia</option><option value="varejo">Varejo</option><option value="tecnologia">Tecnologia</option><option value="commodities">Commodities</option><option value="outros">Outros</option>
        </select>
      </label>
      <label>Valor investido (R$)<input id="assetValue" type="number" min="0" step="0.01" required /></label>
      <label>Preco medio<input id="assetAveragePrice" type="number" min="0" step="0.01" required /></label>
      <label>Quantidade de acoes<input id="assetQuantity" type="number" min="0" step="1" required /></label>
      <label>Perfil do ativo
        <select id="assetProfile" required>
          <option value="">Selecione</option><option value="dividendos">Dividendos</option><option value="crescimento">Crescimento</option><option value="valor">Valor</option><option value="especulacao">Especulacao</option>
        </select>
      </label>
      <label>Nivel de risco
        <select id="assetRisk" required>
          <option value="">Selecione</option><option value="medio">Medio</option><option value="alto">Alto</option>
        </select>
      </label>
      <label>Observacao opcional<input id="assetNote" type="text" /></label>
    `;
    return;
  }

  if (categoria === 'renda fixa') {
    container.innerHTML = `
      <label>Nome do titulo<input id="assetName" type="text" required /></label>
      <label>Tipo de titulo
        <select id="assetTitleType" required>
          <option value="">Selecione</option><option value="tesouro selic">Tesouro Selic</option><option value="tesouro ipca+">Tesouro IPCA+</option><option value="cdb">CDB</option><option value="lci/lca">LCI/LCA</option><option value="debenture">Debenture</option><option value="outro">Outro</option>
        </select>
      </label>
      <label>Valor investido (R$)<input id="assetValue" type="number" min="0" step="0.01" required /></label>
      <label>Rentabilidade<input id="assetYield" type="text" placeholder="Ex: 100% CDI" required /></label>
      <label>Data de vencimento<input id="assetMaturity" type="date" required /></label>
      <label>Liquidez
        <select id="assetLiquidity" required>
          <option value="">Selecione</option><option value="diaria">Diaria</option><option value="no vencimento">No vencimento</option>
        </select>
      </label>
      <label>Garantia FGC
        <select id="assetFGC" required>
          <option value="">Selecione</option><option value="sim">Sim</option><option value="nao">Nao</option><option value="nao se aplica">Nao se aplica</option>
        </select>
      </label>
      <label>Nivel de risco
        <select id="assetRisk" required>
          <option value="">Selecione</option><option value="baixo">Baixo</option><option value="medio">Medio</option>
        </select>
      </label>
    `;
    return;
  }

  if (categoria === 'cripto') {
    container.innerHTML = `
      <label>Nome da moeda<input id="assetName" type="text" required /></label>
      <label>Codigo/Ticker<input id="assetTicker" type="text" required /></label>
      <label>Valor investido (R$)<input id="assetValue" type="number" min="0" step="0.01" required /></label>
      <label>Quantidade de moedas<input id="assetQuantity" type="number" min="0" step="0.00000001" required /></label>
      <label>Preco medio de compra<input id="assetAveragePrice" type="number" min="0" step="0.01" required /></label>
      <label>Objetivo
        <select id="assetObjective" required>
          <option value="">Selecione</option><option value="especulacao">Especulacao</option><option value="reserva de valor">Reserva de valor</option><option value="longo prazo">Longo prazo</option>
        </select>
      </label>
      <input id="assetRisk" type="hidden" value="alto" />
    `;
    return;
  }

  if (categoria === 'fundos imobiliarios') {
    container.innerHTML = `
      <label>Nome do fundo<input id="assetName" type="text" required /></label>
      <label>Codigo/Ticker<input id="assetTicker" type="text" required /></label>
      <label>Tipo de FII
        <select id="assetFiiType" required>
          <option value="">Selecione</option><option value="papel">Papel</option><option value="tijolo">Tijolo</option><option value="hibrido">Hibrido</option><option value="fundos de fundos">Fundos de fundos</option>
        </select>
      </label>
      <label>Valor investido (R$)<input id="assetValue" type="number" min="0" step="0.01" required /></label>
      <label>Preco medio<input id="assetAveragePrice" type="number" min="0" step="0.01" required /></label>
      <label>Quantidade de cotas<input id="assetQuantity" type="number" min="0" step="1" required /></label>
      <label>Dividend yield mensal (%)<input id="assetDyMonthly" type="number" min="0" step="0.01" /></label>
      <label>Segmento
        <select id="assetSegment" required>
          <option value="">Selecione</option><option value="logistica">Logistica</option><option value="shopping">Shopping</option><option value="lajes corporativas">Lajes corporativas</option><option value="recebiveis">Recebiveis</option><option value="galpoes">Galpoes</option><option value="hibrido">Hibrido</option><option value="outros">Outros</option>
        </select>
      </label>
      <label>Nivel de risco
        <select id="assetRisk" required>
          <option value="">Selecione</option><option value="medio">Medio</option><option value="alto">Alto</option>
        </select>
      </label>
    `;
  }
}

function validarAtivoPorCategoria(categoria, dados) {
  if (!categoria) return 'Selecione uma categoria de ativo.';
  if (!dados.name) return 'Nome e obrigatorio.';
  if (!(dados.value > 0)) return 'Valor investido deve ser maior que zero.';

  if (categoria === 'acoes') {
    if (!dados.ticker || !dados.sector || !dados.profile || !dados.risk) return 'Preencha todos os campos obrigatorios de acoes.';
    if (!(dados.quantity > 0)) return 'Quantidade de acoes deve ser maior que zero.';
    if (!(dados.averagePrice > 0)) return 'Preco medio deve ser maior que zero.';
    if (!['medio', 'alto'].includes(dados.risk)) return 'Acoes aceitam apenas risco medio ou alto.';
  }

  if (categoria === 'renda fixa') {
    if (!dados.titleType || !dados.yieldInfo || !dados.maturityDate || !dados.liquidity || !dados.fgc || !dados.risk) {
      return 'Preencha todos os campos obrigatorios de renda fixa.';
    }
    if (!['baixo', 'medio'].includes(dados.risk)) return 'Renda fixa nao pode ter risco alto.';
  }

  if (categoria === 'cripto') {
    if (!dados.ticker || !dados.objective) return 'Preencha todos os campos obrigatorios de cripto.';
    if (!(dados.quantity > 0)) return 'Quantidade de moedas deve ser maior que zero.';
    if (!(dados.averagePrice > 0)) return 'Preco medio deve ser maior que zero.';
    if (dados.risk !== 'alto') return 'Cripto sempre deve ter risco alto.';
  }

  if (categoria === 'fundos imobiliarios') {
    if (!dados.ticker || !dados.fiiType || !dados.segment || !dados.risk) return 'Preencha todos os campos obrigatorios de FIIs.';
    if (!(dados.quantity > 0)) return 'Quantidade de cotas deve ser maior que zero.';
    if (!(dados.averagePrice > 0)) return 'Preco medio deve ser maior que zero.';
    if (!['medio', 'alto'].includes(dados.risk)) return 'FIIs aceitam apenas risco medio ou alto.';
    if (dados.dyMonthly !== null && dados.dyMonthly < 0) return 'Dividend yield mensal nao pode ser negativo.';
  }

  return null;
}

function montarAtivoPorCategoria(categoria) {
  const getValue = (id) => document.getElementById(id)?.value?.trim() || '';
  const getNumber = (id) => Number(document.getElementById(id)?.value);

  if (categoria === 'acoes') {
    return {
      category: 'acoes',
      type: 'acao',
      name: getValue('assetName'),
      ticker: getValue('assetTicker'),
      sector: getValue('assetSector'),
      value: getNumber('assetValue'),
      averagePrice: getNumber('assetAveragePrice'),
      quantity: getNumber('assetQuantity'),
      profile: getValue('assetProfile'),
      risk: getValue('assetRisk'),
      note: getValue('assetNote'),
      liquidity: 'diaria',
      objective: getValue('assetProfile') || 'crescimento',
    };
  }

  if (categoria === 'renda fixa') {
    return {
      category: 'renda fixa',
      type: 'renda fixa',
      name: getValue('assetName'),
      ticker: getValue('assetTitleType') || 'Renda Fixa',
      titleType: getValue('assetTitleType'),
      value: getNumber('assetValue'),
      yieldInfo: getValue('assetYield'),
      maturityDate: getValue('assetMaturity'),
      liquidity: getValue('assetLiquidity'),
      fgc: getValue('assetFGC'),
      risk: getValue('assetRisk'),
      objective: 'reserva',
    };
  }

  if (categoria === 'cripto') {
    return {
      category: 'cripto',
      type: 'cripto',
      name: getValue('assetName'),
      ticker: getValue('assetTicker'),
      value: getNumber('assetValue'),
      quantity: getNumber('assetQuantity'),
      averagePrice: getNumber('assetAveragePrice'),
      objective: getValue('assetObjective'),
      risk: 'alto',
      liquidity: 'baixa',
    };
  }

  if (categoria === 'fundos imobiliarios') {
    const dyRaw = document.getElementById('assetDyMonthly')?.value;
    return {
      category: 'fundos imobiliarios',
      type: 'fundo imobiliario',
      name: getValue('assetName'),
      ticker: getValue('assetTicker'),
      fiiType: getValue('assetFiiType'),
      value: getNumber('assetValue'),
      averagePrice: getNumber('assetAveragePrice'),
      quantity: getNumber('assetQuantity'),
      dyMonthly: dyRaw === '' ? null : Number(dyRaw),
      segment: getValue('assetSegment'),
      risk: getValue('assetRisk'),
      liquidity: 'mensal',
      objective: 'renda',
    };
  }

  return null;
}

function dadosPrincipaisAtivo(asset) {
  if (asset.category === 'acoes') {
    return `Setor: ${asset.sector} | Qtd: ${asset.quantity} | PM: ${formatCurrency(asset.averagePrice)}`;
  }
  if (asset.category === 'renda fixa') {
    return `Tipo: ${asset.titleType} | Rent.: ${asset.yieldInfo} | Venc.: ${asset.maturityDate} | Liq.: ${asset.liquidity}`;
  }
  if (asset.category === 'cripto') {
    return `Qtd: ${asset.quantity} | PM: ${formatCurrency(asset.averagePrice)} | Obj.: ${asset.objective}`;
  }
  if (asset.category === 'fundos imobiliarios') {
    const dy = asset.dyMonthly === null ? '-' : `${asset.dyMonthly}%`;
    return `Tipo FII: ${asset.fiiType} | Qtd: ${asset.quantity} | PM: ${formatCurrency(asset.averagePrice)} | DY: ${dy}`;
  }
  return '-';
}

function renderizarCarteira() {
  const body = document.getElementById('portfolioTableBody');

  if (state.assets.length === 0) {
    body.innerHTML = '<tr><td colspan="8" class="empty-row">Nenhum ativo cadastrado. Escolha uma categoria e adicione seu primeiro ativo.</td></tr>';
    return;
  }

  const total = state.assets.reduce((sum, asset) => sum + asset.value, 0);
  body.innerHTML = state.assets.map((asset, index) => {
    const pct = total > 0 ? (asset.value / total) * 100 : 0;
    return `
      <tr>
        <td>${asset.category}</td>
        <td>${asset.name}</td>
        <td>${asset.ticker || '-'}</td>
        <td>${formatCurrency(asset.value)}</td>
        <td>${pct.toFixed(2)}%</td>
        <td>${dadosPrincipaisAtivo(asset)}</td>
        <td>${asset.risk}</td>
        <td><button class="remove-btn" data-index="${index}">Remover</button></td>
      </tr>
    `;
  }).join('');

  document.querySelectorAll('.remove-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const index = Number(btn.dataset.index);
      state.assets.splice(index, 1);
      atualizarDashboardCarteira();
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
  grid.innerHTML = `
    <div class="metric-item"><strong>Valor total investido</strong>${formatCurrency(m.totalInvested)}</div>
    <div class="metric-item"><strong>Quantidade de ativos</strong>${m.assetsCount}</div>
    <div class="metric-item"><strong>Quantidade de tipos</strong>${m.typesCount}</div>
    <div class="metric-item"><strong>Maior concentracao</strong>${m.maxConcentrationPercent.toFixed(2)}%</div>
    <div class="metric-item"><strong>Ativo mais concentrado</strong>${m.topConcentrationAsset}</div>
    <div class="metric-item"><strong>% em renda fixa</strong>${m.percentFixedIncome.toFixed(2)}%</div>
    <div class="metric-item"><strong>% em renda variavel</strong>${m.percentVariableIncome.toFixed(2)}%</div>
    <div class="metric-item"><strong>% em risco alto</strong>${m.percentHighRisk.toFixed(2)}%</div>
    <div class="metric-item"><strong>% em liquidez diaria</strong>${m.percentDailyLiquidity.toFixed(2)}%</div>
    <div class="metric-item"><strong>Diversificacao</strong>${m.diversification}</div>
    <div class="metric-item"><strong>Risco geral</strong>${m.riskClassification}</div>
    <div class="metric-item"><strong>Score da carteira</strong>${m.score}/100</div>
  `;
}

async function gerarRecomendacoes() {
  const response = await postData('/api/recommendations', {
    profileAnalysis: state.profileAnalysis,
    portfolioMetrics: state.portfolioMetrics,
  });
  state.recommendations = response.recommendations;
}

function renderizarRecomendacoes() {
  const list = document.getElementById('recommendationsList');
  if (!state.recommendations.length) {
    list.innerHTML = '<li>Sem recomendacoes no momento.</li>';
    return;
  }
  list.innerHTML = state.recommendations.map((item) => `<li>${item}</li>`).join('');
}

async function atualizarDashboardCarteira() {
  renderizarCarteira();

  if (state.assets.length === 0) {
    state.portfolioMetrics = null;
    renderizarMetricasCarteira();
    state.recommendations = ['Adicione ativos para gerar recomendacoes mais completas.'];
    renderizarRecomendacoes();
    return;
  }

  try {
    await calcularMetricasCarteira();
    renderizarMetricasCarteira();
    await gerarRecomendacoes();
    renderizarRecomendacoes();
  } catch (error) {
    state.recommendations = [error.message];
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

    state.assets.push(ativo);
    setMessage(msg, 'Ativo adicionado com sucesso.', 'success');
    renderizarCamposAtivoPorCategoria(categoria);
    await atualizarDashboardCarteira();
  } catch (error) {
    setMessage(msg, error.message, 'error');
  }
}

document.getElementById('profileForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    state.profileAnalysis = await postData('/api/profile-analysis', coletarDadosPerfil());
    renderizarPerfil();
    await atualizarDashboardCarteira();
  } catch (error) {
    setMessage(document.getElementById('profileResult'), error.message, 'error');
  }
});

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
renderizarCamposAtivoPorCategoria('');
atualizarDashboardCarteira();
