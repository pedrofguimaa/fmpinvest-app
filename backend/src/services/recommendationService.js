function generateRecommendations({ profileAnalysis, portfolioMetrics }) {
  const recommendations = [];

  if (profileAnalysis) {
    if (profileAnalysis.emergencyReserveMonths < 3) {
      recommendations.push('Priorize formar reserva de emergencia de pelo menos 3 meses de gastos.');
    }

    if (profileAnalysis.investmentRate < 10) {
      recommendations.push('Sua taxa de investimento esta abaixo de 10%. Aumente os aportes de forma gradual.');
    }

    if (profileAnalysis.expenseRate > 80) {
      recommendations.push('Seus gastos estao acima de 80% da renda. Ajuste o orcamento antes de aumentar risco.');
    }
  }

  if (portfolioMetrics) {
    if (portfolioMetrics.assetsCount < 3) {
      recommendations.push('Adicione mais ativos para melhorar diversificacao.');
    }

    if (portfolioMetrics.typesCount === 1) {
      recommendations.push('Sua carteira tem apenas um tipo de ativo. Estude outras classes de investimento.');
    }

    if (portfolioMetrics.maxConcentrationPercent > 50) {
      recommendations.push('Existe concentracao acima de 50% em um unico ativo. Reduza a dependencia desse ativo.');
    }

    if (profileAnalysis?.investorProfile === 'conservador' && portfolioMetrics.percentHighRisk > 30) {
      recommendations.push('Seu perfil e conservador, mas a carteira tem risco alto relevante. Rebalanceie para ativos mais estaveis.');
    }

    if (profileAnalysis?.investorProfile === 'arrojado' && portfolioMetrics.percentFixedIncome > 80) {
      recommendations.push('Seu perfil e arrojado, mas a carteira esta concentrada em renda fixa. Estude renda variavel com cautela.');
    }

    if ((profileAnalysis?.hasEmergencyReserve === 'nao' || profileAnalysis?.hasEmergencyReserve === 'parcialmente') && portfolioMetrics.percentDailyLiquidity < 20) {
      recommendations.push('Voce possui pouca liquidez diaria e reserva insuficiente. Aumente a parcela de ativos liquidos.');
    }

    if (portfolioMetrics.score > 80) {
      recommendations.push('Carteira bem estruturada para o momento. Continue acompanhando e ajustando mensalmente.');
    } else if (portfolioMetrics.score >= 50) {
      recommendations.push('Carteira razoavel, com pontos claros de melhoria em diversificacao e equilibrio de risco.');
    } else {
      recommendations.push('Carteira precisa de ajustes importantes para reduzir riscos e melhorar estrutura.');
    }
  }

  if (recommendations.length === 0) {
    recommendations.push('Sem alertas criticos no momento. Continue o acompanhamento mensal da carteira.');
  }

  return recommendations;
}

module.exports = {
  generateRecommendations,
};
