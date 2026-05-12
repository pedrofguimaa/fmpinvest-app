const { analyzeProfile, evaluateInvestorSuitability } = require('../src/services/profileService');

describe('profileService', () => {
  const basePayload = {
    userName: 'Ana',
    age: 30,
    monthlyIncome: 6000,
    monthlyExpense: 3000,
    monthlyContribution: 600,
    emergencyReserveAmount: 12000,
    mainGoal: 'Aposentadoria',
    goalMonths: 120,
    knowledgeLevel: 'intermediario',
    riskTolerance: 'media',
    investmentHorizon: 'medio prazo',
    hasEmergencyReserve: 'sim',
    liquidityPreference: 'media',
  };

  test('analisa perfil com dados validos', () => {
    const result = analyzeProfile(basePayload);
    expect(result.userName).toBe('Ana');
    expect(result.investorProfile).toBe('moderado');
    expect(result.investmentRate).toBeCloseTo(10, 2);
    expect(result.investorScore).toBeGreaterThanOrEqual(1);
    expect(result.investorScore).toBeLessThanOrEqual(50);
  });

  test('perfil conservador severo', () => {
    const result = evaluateInvestorSuitability({
      riskTolerance: 'baixa',
      knowledgeLevel: 'iniciante',
      investmentHorizon: 'curto prazo',
      liquidityPreference: 'alta',
      hasEmergencyReserve: 'nao',
      confortoInvestimentos: ['poupanca'],
    });

    expect(result.profile).toBe('conservador severo');
    expect(result.score).toBeGreaterThanOrEqual(1);
    expect(result.score).toBeLessThanOrEqual(50);
  });

  test('perfil conservador moderado', () => {
    const result = evaluateInvestorSuitability({
      riskTolerance: 'baixa',
      knowledgeLevel: 'intermediario',
      investmentHorizon: 'medio prazo',
      liquidityPreference: 'alta',
      hasEmergencyReserve: 'parcialmente',
      confortoInvestimentos: ['tesouro selic', 'cdb'],
    });

    expect(result.profile).toBe('conservador moderado');
  });

  test('perfil moderado', () => {
    const result = evaluateInvestorSuitability({
      riskTolerance: 'media',
      knowledgeLevel: 'intermediario',
      investmentHorizon: 'medio prazo',
      liquidityPreference: 'media',
      hasEmergencyReserve: 'sim',
      confortoInvestimentos: ['cdb', 'fii'],
    });

    expect(result.profile).toBe('moderado');
  });

  test('perfil medio-alto risco', () => {
    const result = evaluateInvestorSuitability({
      riskTolerance: 'alta',
      knowledgeLevel: 'intermediario',
      investmentHorizon: 'longo prazo',
      liquidityPreference: 'baixa',
      hasEmergencyReserve: 'sim',
      confortoInvestimentos: ['acoes', 'etf'],
    });

    expect(result.profile).toBe('medio-alto risco');
  });

  test('perfil alto risco', () => {
    const result = evaluateInvestorSuitability({
      riskTolerance: 'alta',
      knowledgeLevel: 'avancado',
      investmentHorizon: 'longo prazo',
      liquidityPreference: 'baixa',
      hasEmergencyReserve: 'sim',
      confortoInvestimentos: ['acoes', 'cripto', 'etf'],
    });

    expect(result.profile).toBe('alto risco');
  });

  test('pontuacao fica entre 1 e 50', () => {
    const baixo = evaluateInvestorSuitability({
      riskTolerance: 'baixa',
      knowledgeLevel: 'iniciante',
      investmentHorizon: 'curto prazo',
      liquidityPreference: 'alta',
      hasEmergencyReserve: 'nao',
      confortoInvestimentos: [],
    });

    const alto = evaluateInvestorSuitability({
      riskTolerance: 'alta',
      knowledgeLevel: 'avancado',
      investmentHorizon: 'longo prazo',
      liquidityPreference: 'baixa',
      hasEmergencyReserve: 'sim',
      confortoInvestimentos: ['acoes', 'cripto', 'etf', 'fii', 'cdb'],
    });

    expect(baixo.score).toBeGreaterThanOrEqual(1);
    expect(alto.score).toBeLessThanOrEqual(50);
  });

  test('suporta multipla escolha de investimentos confortaveis', () => {
    const semMultiplos = evaluateInvestorSuitability({
      riskTolerance: 'media',
      knowledgeLevel: 'intermediario',
      investmentHorizon: 'medio prazo',
      liquidityPreference: 'media',
      hasEmergencyReserve: 'sim',
      confortoInvestimentos: ['cdb'],
    });

    const comMultiplos = evaluateInvestorSuitability({
      riskTolerance: 'media',
      knowledgeLevel: 'intermediario',
      investmentHorizon: 'medio prazo',
      liquidityPreference: 'media',
      hasEmergencyReserve: 'sim',
      confortoInvestimentos: ['cdb', 'etf', 'acoes'],
    });

    expect(comMultiplos.score).toBeGreaterThan(semMultiplos.score);
  });
});
