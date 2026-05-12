const { simulateCompoundInterest } = require('../src/services/simulationService');

describe('simulationService', () => {
  test('calcula com valor inicial e aporte mensal', () => {
    const result = simulateCompoundInterest({
      initialAmount: 1000,
      recurringContribution: 500,
      monthlyRatePercent: 1,
      months: 12,
      targetAmount: 8000,
    });

    expect(result.finalAmount).toBeGreaterThan(7000);
    expect(result.totalContributed).toBe(7000);
    expect(result.estimatedReturn).toBeCloseTo(result.finalAmount - result.totalContributed, 2);
    expect(result.targetDifference).toBeCloseTo(result.finalAmount - 8000, 2);
  });

  test('calcula corretamente com taxa zero', () => {
    const result = simulateCompoundInterest({
      initialAmount: 1000,
      recurringContribution: 200,
      monthlyRatePercent: 0,
      months: 10,
      targetAmount: 4000,
    });

    expect(result.finalAmount).toBe(3000);
    expect(result.totalContributed).toBe(3000);
    expect(result.estimatedReturn).toBe(0);
  });

  test('erro para valores negativos', () => {
    expect(() => simulateCompoundInterest({
      initialAmount: -1,
      recurringContribution: 200,
      monthlyRatePercent: 1,
      months: 10,
      targetAmount: 1000,
    })).toThrow('Valores da simulacao devem ser numeros nao negativos.');
  });

  test('erro para meses igual a zero', () => {
    expect(() => simulateCompoundInterest({
      initialAmount: 100,
      recurringContribution: 100,
      monthlyRatePercent: 1,
      months: 0,
      targetAmount: 1000,
    })).toThrow('Quantidade de meses deve ser maior que zero.');
  });
});
