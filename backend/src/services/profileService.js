function isValidPositiveNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function isValidNonNegativeNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function suggestInvestorProfile({ riskTolerance, knowledgeLevel, investmentHorizon, liquidityPreference }) {
  if (
    riskTolerance === 'alta' &&
    knowledgeLevel === 'avancado' &&
    investmentHorizon === 'longo prazo' &&
    liquidityPreference !== 'alta'
  ) {
    return 'arrojado';
  }

  if (riskTolerance === 'media' && knowledgeLevel === 'intermediario') {
    return 'moderado';
  }

  if (riskTolerance === 'baixa' || knowledgeLevel === 'iniciante' || liquidityPreference === 'alta') {
    return 'conservador';
  }

  return 'moderado';
}

function toScoreRange(value, min = 1, max = 50) {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function mapConfortoInvestimentos(confortoInvestimentos) {
  if (Array.isArray(confortoInvestimentos)) {
    const normalized = confortoInvestimentos.map((item) => String(item || '').toLowerCase());
    const table = {
      poupanca: 1,
      'tesouro selic': 2,
      cdb: 2,
      fii: 3,
      etf: 2,
      acoes: 3,
      cripto: 5,
    };
    const raw = normalized.reduce((sum, item) => sum + (table[item] || 0), 0);
    return Math.min(raw, 12);
  }
  return 0;
}

function evaluateInvestorSuitability({
  riskTolerance = 'media',
  knowledgeLevel = 'intermediario',
  investmentHorizon = 'medio prazo',
  liquidityPreference = 'media',
  hasEmergencyReserve = 'parcialmente',
  confortoInvestimentos = [],
} = {}) {
  const riskPoints = { baixa: 4, media: 10, alta: 16 }[String(riskTolerance).toLowerCase()] || 8;
  const knowledgePoints = { iniciante: 2, intermediario: 6, avancado: 10 }[String(knowledgeLevel).toLowerCase()] || 5;
  const horizonPoints = { 'curto prazo': 2, 'medio prazo': 5, 'longo prazo': 8 }[String(investmentHorizon).toLowerCase()] || 5;
  const liquidityPoints = { alta: -3, media: 0, baixa: 2 }[String(liquidityPreference).toLowerCase()] || 0;
  const reservePoints = { nao: -2, parcialmente: 0, sim: 2 }[String(hasEmergencyReserve).toLowerCase()] || 0;
  const comfortPoints = mapConfortoInvestimentos(confortoInvestimentos);

  const score = toScoreRange(riskPoints + knowledgePoints + horizonPoints + liquidityPoints + reservePoints + comfortPoints, 1, 50);

  let profile = 'moderado';
  if (score <= 12) profile = 'conservador severo';
  else if (score <= 20) profile = 'conservador moderado';
  else if (score <= 30) profile = 'moderado';
  else if (score <= 40) profile = 'medio-alto risco';
  else profile = 'alto risco';

  return { score, profile };
}

function analyzeEmergencyReserve(emergencyReserveAmount, monthlyExpense) {
  if (!isValidNonNegativeNumber(emergencyReserveAmount) || !isValidPositiveNumber(monthlyExpense)) {
    throw new Error('Reserva de emergencia e gasto mensal devem ser valores validos.');
  }

  const monthsCovered = emergencyReserveAmount / monthlyExpense;
  let status = 'baixa';

  if (monthsCovered >= 6) status = 'adequada';
  else if (monthsCovered >= 3) status = 'parcialmente adequada';

  return {
    monthsCovered: Number(monthsCovered.toFixed(2)),
    status,
  };
}

function analyzeProfile(payload) {
  const {
    userName,
    age,
    monthlyIncome,
    monthlyExpense,
    monthlyContribution,
    emergencyReserveAmount,
    mainGoal,
    goalMonths,
    knowledgeLevel,
    riskTolerance,
    investmentHorizon,
    hasEmergencyReserve,
    liquidityPreference,
  } = payload;

  if (!String(userName || '').trim()) throw new Error('Nome do usuario e obrigatorio.');
  if (!Number.isInteger(age) || age <= 0) throw new Error('Idade deve ser um numero inteiro maior que zero.');
  if (!isValidPositiveNumber(monthlyIncome)) throw new Error('Renda mensal deve ser maior que zero.');
  if (!isValidNonNegativeNumber(monthlyExpense)) throw new Error('Gasto mensal medio nao pode ser negativo.');
  if (!isValidNonNegativeNumber(monthlyContribution)) throw new Error('Aporte mensal nao pode ser negativo.');
  if (!isValidNonNegativeNumber(emergencyReserveAmount)) throw new Error('Reserva de emergencia nao pode ser negativa.');
  if (!String(mainGoal || '').trim()) throw new Error('Objetivo financeiro principal e obrigatorio.');
  if (!Number.isInteger(goalMonths) || goalMonths <= 0) throw new Error('Prazo do objetivo deve ser maior que zero.');

  const investmentRate = (monthlyContribution / monthlyIncome) * 100;
  const availableIncome = monthlyIncome - monthlyExpense;
  const expenseRate = (monthlyExpense / monthlyIncome) * 100;

  const investorProfile = suggestInvestorProfile({
    riskTolerance,
    knowledgeLevel,
    investmentHorizon,
    liquidityPreference,
  });

  const reserve = analyzeEmergencyReserve(emergencyReserveAmount, monthlyExpense === 0 ? 1 : monthlyExpense);
  const suitability = evaluateInvestorSuitability({
    riskTolerance,
    knowledgeLevel,
    investmentHorizon,
    liquidityPreference,
    hasEmergencyReserve,
  });

  const diagnosis = [];
  if (expenseRate > 80) diagnosis.push('Seu orcamento esta apertado: gastos acima de 80% da renda.');
  if (reserve.monthsCovered < 3) diagnosis.push('Sua reserva de emergencia esta baixa para o nivel de gastos atual.');
  if (investmentRate < 10) diagnosis.push('Sua taxa de investimento esta abaixo de 10%; tente evoluir aportes aos poucos.');
  if (diagnosis.length === 0) diagnosis.push('Seu perfil inicial esta consistente para continuar evoluindo a carteira.');

  return {
    userName,
    age,
    mainGoal,
    goalMonths,
    hasEmergencyReserve,
    investmentRate: Number(investmentRate.toFixed(2)),
    availableIncome: Number(availableIncome.toFixed(2)),
    expenseRate: Number(expenseRate.toFixed(2)),
    investorProfile,
    investorProfileDetailed: suitability.profile,
    investorScore: suitability.score,
    emergencyReserveStatus: reserve.status,
    emergencyReserveMonths: reserve.monthsCovered,
    diagnosis,
  };
}

module.exports = {
  analyzeProfile,
  isValidNonNegativeNumber,
  evaluateInvestorSuitability,
};
