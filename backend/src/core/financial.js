function validateNonNegativeNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function calculateInvestmentRate(monthlyIncome, monthlyContribution) {
  if (!validateNonNegativeNumber(monthlyIncome) || !validateNonNegativeNumber(monthlyContribution)) {
    throw new Error('Renda mensal e aporte mensal devem ser numeros validos e nao negativos.');
  }

  if (monthlyIncome === 0) {
    throw new Error('A renda mensal deve ser maior que zero para calcular a taxa de investimento.');
  }

  return (monthlyContribution / monthlyIncome) * 100;
}

function calculateCompoundInterest(initialAmount, monthlyRatePercent, months, recurringContribution = 0) {
  const monthlyRate = monthlyRatePercent / 100;

  const validInputs = [initialAmount, monthlyRatePercent, months, recurringContribution].every(validateNonNegativeNumber);
  if (!validInputs) {
    throw new Error('Todos os valores devem ser numeros validos e nao negativos.');
  }

  const growthFactor = Math.pow(1 + monthlyRate, months);
  const futureInitial = initialAmount * growthFactor;

  if (monthlyRate === 0) {
    return futureInitial + recurringContribution * months;
  }

  const futureContributions = recurringContribution * ((growthFactor - 1) / monthlyRate);
  return futureInitial + futureContributions;
}

module.exports = {
  calculateInvestmentRate,
  calculateCompoundInterest,
  validateNonNegativeNumber,
};
