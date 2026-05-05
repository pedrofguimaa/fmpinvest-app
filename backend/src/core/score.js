function calculatePortfolioScore(assets = [], assetTypes = []) {
  if (!Array.isArray(assets)) {
    throw new Error('A lista de ativos deve ser um array.');
  }

  const totalValue = assets.reduce((sum, asset) => sum + (Number(asset.value) || 0), 0);

  if (assets.length === 0 || totalValue <= 0) {
    return {
      score: 0,
      details: {
        assetsCount: 0,
        maxConcentrationPercent: 0,
        typesCount: 0,
      },
      message: 'Adicione ativos para gerar o score da carteira.',
    };
  }

  const maxAssetValue = Math.max(...assets.map((asset) => Number(asset.value) || 0));
  const maxConcentrationPercent = (maxAssetValue / totalValue) * 100;

  let score = 0;

  if (assets.length >= 8) score += 4;
  else if (assets.length >= 5) score += 3;
  else if (assets.length >= 3) score += 2;
  else score += 1;

  if (maxConcentrationPercent <= 20) score += 4;
  else if (maxConcentrationPercent <= 35) score += 3;
  else if (maxConcentrationPercent <= 50) score += 2;
  else score += 1;

  const uniqueTypes = new Set(assetTypes.filter(Boolean).map((type) => String(type).trim().toLowerCase()));
  if (uniqueTypes.size >= 4) score += 2;
  else if (uniqueTypes.size >= 2) score += 1;

  return {
    score,
    details: {
      assetsCount: assets.length,
      maxConcentrationPercent: Number(maxConcentrationPercent.toFixed(2)),
      typesCount: uniqueTypes.size,
    },
    message: 'Score calculado com base em diversificacao, concentracao e tipos de investimento.',
  };
}

module.exports = {
  calculatePortfolioScore,
};
