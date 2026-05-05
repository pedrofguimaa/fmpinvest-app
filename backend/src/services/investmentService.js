function isValidNonNegativeNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function calculateInvestmentRate(monthlyIncome, monthlyContribution) {
  if (!isValidNonNegativeNumber(monthlyIncome) || !isValidNonNegativeNumber(monthlyContribution)) {
    throw new Error('Renda mensal e aporte mensal devem ser numeros validos e nao negativos.');
  }

  if (monthlyIncome <= 0) {
    throw new Error('A renda mensal deve ser maior que zero.');
  }

  return (monthlyContribution / monthlyIncome) * 100;
}

function calculateCompoundInterest(initialAmount, recurringContribution, monthlyRatePercent, months) {
  const inputs = [initialAmount, recurringContribution, monthlyRatePercent, months];
  const allValid = inputs.every(isValidNonNegativeNumber);

  if (!allValid) {
    throw new Error('Os valores da simulacao devem ser numeros validos e nao negativos.');
  }

  if (months <= 0) {
    throw new Error('A quantidade de meses deve ser maior que zero.');
  }

  const monthlyRate = monthlyRatePercent / 100;
  const growthFactor = Math.pow(1 + monthlyRate, months);
  const futureInitial = initialAmount * growthFactor;

  let futureContributions = recurringContribution * months;
  if (monthlyRate > 0) {
    futureContributions = recurringContribution * ((growthFactor - 1) / monthlyRate);
  }

  const finalAmount = futureInitial + futureContributions;
  const totalContributed = initialAmount + recurringContribution * months;
  const estimatedReturn = finalAmount - totalContributed;

  return {
    finalAmount,
    totalContributed,
    estimatedReturn,
  };
}

module.exports = {
  calculateInvestmentRate,
  calculateCompoundInterest,
  isValidNonNegativeNumber,
};
