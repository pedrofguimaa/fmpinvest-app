function calculatePortfolioMetrics(assets = [], investorProfile = null) {
  if (!Array.isArray(assets)) {
    throw new Error('Assets deve ser uma lista.');
  }

  const normalized = assets.map((asset) => ({
    name: String(asset.name || '').trim(),
    type: String(asset.type || '').trim().toLowerCase(),
    value: Number(asset.value),
    expectedAnnualReturn: asset.expectedAnnualReturn === null || asset.expectedAnnualReturn === undefined
      ? null
      : Number(asset.expectedAnnualReturn),
    risk: String(asset.risk || '').trim().toLowerCase(),
    liquidity: String(asset.liquidity || '').trim().toLowerCase(),
    objective: String(asset.objective || '').trim().toLowerCase(),
  }));

  const totalInvested = normalized.reduce((sum, asset) => sum + (Number.isFinite(asset.value) ? asset.value : 0), 0);
  const assetsCount = normalized.length;
  const typesCount = new Set(normalized.map((asset) => asset.type).filter(Boolean)).size;

  const biggestAsset = normalized.reduce(
    (max, asset) => (asset.value > max.value ? asset : max),
    { name: '-', value: 0 }
  );

  const maxConcentrationPercent = totalInvested > 0 ? (biggestAsset.value / totalInvested) * 100 : 0;

  const variableTypes = ['acao', 'fundo imobiliario', 'etf', 'cripto', 'fundo de investimento'];
  const variableValue = normalized
    .filter((asset) => variableTypes.includes(asset.type))
    .reduce((sum, asset) => sum + asset.value, 0);

  const fixedIncomeValue = normalized
    .filter((asset) => asset.type === 'renda fixa')
    .reduce((sum, asset) => sum + asset.value, 0);

  const highRiskValue = normalized
    .filter((asset) => asset.risk === 'alto')
    .reduce((sum, asset) => sum + asset.value, 0);

  const cryptoValue = normalized
    .filter((asset) => asset.type === 'cripto')
    .reduce((sum, asset) => sum + asset.value, 0);

  const dailyLiquidityValue = normalized
    .filter((asset) => asset.liquidity === 'diaria')
    .reduce((sum, asset) => sum + asset.value, 0);

  const percentFixedIncome = totalInvested > 0 ? (fixedIncomeValue / totalInvested) * 100 : 0;
  const percentVariableIncome = totalInvested > 0 ? (variableValue / totalInvested) * 100 : 0;
  const percentHighRisk = totalInvested > 0 ? (highRiskValue / totalInvested) * 100 : 0;
  const percentCrypto = totalInvested > 0 ? (cryptoValue / totalInvested) * 100 : 0;
  const percentDailyLiquidity = totalInvested > 0 ? (dailyLiquidityValue / totalInvested) * 100 : 0;

  let diversification = 'baixa';
  if (assetsCount >= 5 && typesCount >= 3 && maxConcentrationPercent <= 40) diversification = 'boa';
  else if (assetsCount >= 3 && typesCount >= 2 && maxConcentrationPercent <= 60) diversification = 'media';

  let riskClassification = 'baixo';
  if (percentHighRisk > 40) riskClassification = 'alto';
  else if (percentHighRisk >= 20) riskClassification = 'medio';

  let score = 100;
  if (assetsCount < 2) score -= 30;
  else if (assetsCount < 3) score -= 15;

  if (typesCount <= 1) score -= 25;
  else if (typesCount === 2) score -= 10;

  if (maxConcentrationPercent > 50) score -= 20;
  else if (maxConcentrationPercent >= 35) score -= 10;

  if (percentCrypto > 30) score -= 15;
  if (percentHighRisk > 40) score -= 15;
  if (percentFixedIncome === 0) score -= 10;

  if (diversification === 'baixa') score -= 15;
  else if (diversification === 'media') score -= 5;

  if (investorProfile === 'conservador') {
    if (percentHighRisk > 45 || percentCrypto > 25) score -= 20;
    else if (percentHighRisk > 30 || percentCrypto > 15) score -= 10;
  } else if (investorProfile === 'moderado') {
    if (maxConcentrationPercent > 60 || percentHighRisk > 60) score -= 15;
    else if (maxConcentrationPercent > 50 || percentHighRisk > 45) score -= 10;
  } else if (investorProfile === 'arrojado') {
    if (percentFixedIncome > 90) score -= 20;
    else if (percentFixedIncome > 80) score -= 10;
  }

  score = Math.max(0, Math.min(100, score));

  return {
    totalInvested: Number(totalInvested.toFixed(2)),
    assetsCount,
    typesCount,
    maxConcentrationPercent: Number(maxConcentrationPercent.toFixed(2)),
    topConcentrationAsset: biggestAsset.name || '-',
    percentFixedIncome: Number(percentFixedIncome.toFixed(2)),
    percentVariableIncome: Number(percentVariableIncome.toFixed(2)),
    percentHighRisk: Number(percentHighRisk.toFixed(2)),
    percentCrypto: Number(percentCrypto.toFixed(2)),
    percentDailyLiquidity: Number(percentDailyLiquidity.toFixed(2)),
    diversification,
    riskClassification,
    score,
  };
}

module.exports = {
  calculatePortfolioMetrics,
};
