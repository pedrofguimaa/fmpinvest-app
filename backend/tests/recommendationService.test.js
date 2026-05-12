const { generateRecommendations } = require('../src/services/recommendationService');

describe('recommendationService', () => {
  test('retorna recomendacao quando nao ha ativos', () => {
    const recommendations = generateRecommendations({
      profileAnalysis: null,
      portfolioMetrics: { assetsCount: 0, typesCount: 0, maxConcentrationPercent: 0, percentHighRisk: 0, percentFixedIncome: 0, percentDailyLiquidity: 0, score: 0 },
    });

    expect(recommendations.some((item) => item.includes('Adicione mais ativos'))).toBe(true);
  });

  test('recomendacao para carteira com apenas um ativo e baixa diversificacao', () => {
    const recommendations = generateRecommendations({
      profileAnalysis: { investorProfile: 'moderado', hasEmergencyReserve: 'sim' },
      portfolioMetrics: { assetsCount: 1, typesCount: 1, maxConcentrationPercent: 100, percentHighRisk: 10, percentFixedIncome: 20, percentDailyLiquidity: 30, score: 40 },
    });

    expect(recommendations.some((item) => item.includes('Adicione mais ativos'))).toBe(true);
    expect(recommendations.some((item) => item.includes('apenas um tipo de ativo'))).toBe(true);
    expect(recommendations.some((item) => item.includes('concentracao acima de 50%'))).toBe(true);
  });

  test('recomendacao para carteira desalinhada com perfil conservador', () => {
    const recommendations = generateRecommendations({
      profileAnalysis: { investorProfile: 'conservador', hasEmergencyReserve: 'sim' },
      portfolioMetrics: { assetsCount: 4, typesCount: 3, maxConcentrationPercent: 35, percentHighRisk: 45, percentFixedIncome: 20, percentDailyLiquidity: 40, score: 55 },
    });

    expect(recommendations.some((item) => item.includes('perfil e conservador'))).toBe(true);
  });

  test('recomendacao para excesso de risco alto', () => {
    const recommendations = generateRecommendations({
      profileAnalysis: { investorProfile: 'moderado', hasEmergencyReserve: 'sim' },
      portfolioMetrics: { assetsCount: 4, typesCount: 3, maxConcentrationPercent: 35, percentHighRisk: 60, percentFixedIncome: 10, percentDailyLiquidity: 50, score: 45 },
    });

    expect(recommendations.some((item) => item.includes('Carteira precisa de ajustes importantes'))).toBe(true);
  });

  test('recomendacao para baixa liquidez com reserva insuficiente', () => {
    const recommendations = generateRecommendations({
      profileAnalysis: { investorProfile: 'moderado', hasEmergencyReserve: 'nao' },
      portfolioMetrics: { assetsCount: 4, typesCount: 3, maxConcentrationPercent: 35, percentHighRisk: 20, percentFixedIncome: 50, percentDailyLiquidity: 10, score: 60 },
    });

    expect(recommendations.some((item) => item.includes('pouca liquidez diaria'))).toBe(true);
  });

  test('recomendacao positiva para carteira bem estruturada', () => {
    const recommendations = generateRecommendations({
      profileAnalysis: { investorProfile: 'moderado', hasEmergencyReserve: 'sim' },
      portfolioMetrics: { assetsCount: 6, typesCount: 4, maxConcentrationPercent: 28, percentHighRisk: 20, percentFixedIncome: 45, percentDailyLiquidity: 40, score: 85 },
    });

    expect(recommendations.some((item) => item.includes('Carteira bem estruturada'))).toBe(true);
  });
});
