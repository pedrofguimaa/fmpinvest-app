function isValidNonNegativeNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function simulateCompoundInterest({ initialAmount, recurringContribution, monthlyRatePercent, months, targetAmount }) {
  const values = [initialAmount, recurringContribution, monthlyRatePercent, targetAmount];
  if (!values.every(isValidNonNegativeNumber)) {
    throw new Error('Valores da simulacao devem ser numeros nao negativos.');
  }

  if (!Number.isInteger(months) || months <= 0) {
    throw new Error('Quantidade de meses deve ser maior que zero.');
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
  const targetDifference = finalAmount - targetAmount;

  return {
    finalAmount: Number(finalAmount.toFixed(2)),
    totalContributed: Number(totalContributed.toFixed(2)),
    estimatedReturn: Number(estimatedReturn.toFixed(2)),
    targetDifference: Number(targetDifference.toFixed(2)),
    reachedTarget: targetDifference >= 0,
  };
}

module.exports = {
  simulateCompoundInterest,
};
