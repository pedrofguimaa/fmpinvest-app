const { calculatePortfolioMetrics } = require('../src/services/portfolioService');

describe('portfolioService', () => {
  test('calcula metricas completas da carteira', () => {
    const assets = [
      { name: 'Tesouro Selic', type: 'renda fixa', value: 4000, risk: 'baixo', liquidity: 'diaria', objective: 'reserva' },
      { name: 'PETR4', type: 'acao', value: 3000, risk: 'alto', liquidity: 'diaria', objective: 'crescimento' },
      { name: 'BTC', type: 'cripto', value: 2000, risk: 'alto', liquidity: 'diaria', objective: 'especulacao' },
      { name: 'MXRF11', type: 'fundo imobiliario', value: 1000, risk: 'medio', liquidity: 'diaria', objective: 'renda' },
    ];

    const metrics = calculatePortfolioMetrics(assets);

    expect(metrics.totalInvested).toBe(10000);
    expect(metrics.assetsCount).toBe(4);
    expect(metrics.typesCount).toBe(4);
    expect(metrics.maxConcentrationPercent).toBe(40);
    expect(metrics.topConcentrationAsset).toBe('Tesouro Selic');
    expect(metrics.percentFixedIncome).toBe(40);
    expect(metrics.percentVariableIncome).toBe(60);
    expect(metrics.percentCrypto).toBe(20);
    expect(metrics.percentHighRisk).toBe(50);
    expect(metrics.percentDailyLiquidity).toBe(100);
    expect(metrics.diversification).toBe('media');
    expect(metrics.riskClassification).toBe('alto');
  });

  test('score baixo para carteira com um ativo', () => {
    const metrics = calculatePortfolioMetrics([
      { name: 'BTC', type: 'cripto', value: 10000, risk: 'alto', liquidity: 'diaria', objective: 'especulacao' },
    ]);

    expect(metrics.score).toBeLessThan(50);
    expect(metrics.assetsCount).toBe(1);
  });

  test('carteira concentrada perde pontos', () => {
    const metrics = calculatePortfolioMetrics([
      { name: 'PETR4', type: 'acao', value: 9000, risk: 'alto', liquidity: 'diaria', objective: 'crescimento' },
      { name: 'Tesouro', type: 'renda fixa', value: 1000, risk: 'baixo', liquidity: 'diaria', objective: 'reserva' },
    ]);

    expect(metrics.maxConcentrationPercent).toBe(90);
    expect(metrics.score).toBeLessThanOrEqual(55);
  });

  test('carteira com boa diversificacao tende a score maior', () => {
    const ruim = calculatePortfolioMetrics([
      { name: 'Ativo Unico', type: 'acao', value: 10000, risk: 'alto', liquidity: 'diaria', objective: 'crescimento' },
    ]);

    const boa = calculatePortfolioMetrics([
      { name: 'Tesouro', type: 'renda fixa', value: 3000, risk: 'baixo', liquidity: 'diaria', objective: 'reserva' },
      { name: 'CDB', type: 'renda fixa', value: 2000, risk: 'baixo', liquidity: 'mensal', objective: 'reserva' },
      { name: 'PETR4', type: 'acao', value: 2000, risk: 'medio', liquidity: 'diaria', objective: 'crescimento' },
      { name: 'IVVB11', type: 'etf', value: 1500, risk: 'medio', liquidity: 'diaria', objective: 'diversificacao' },
      { name: 'MXRF11', type: 'fundo imobiliario', value: 1500, risk: 'medio', liquidity: 'diaria', objective: 'renda' },
    ]);

    expect(boa.diversification).toBe('boa');
    expect(boa.score).toBeGreaterThan(ruim.score);
  });

  test('score fica entre 0 e 100', () => {
    const metrics = calculatePortfolioMetrics([
      { name: 'BTC', type: 'cripto', value: 10000, risk: 'alto', liquidity: 'diaria', objective: 'especulacao' },
    ], 'conservador');

    expect(metrics.score).toBeGreaterThanOrEqual(0);
    expect(metrics.score).toBeLessThanOrEqual(100);
  });
});
