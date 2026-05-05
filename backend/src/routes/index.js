const express = require('express');
const { analyzeProfile, isValidNonNegativeNumber } = require('../services/profileService');
const { calculatePortfolioMetrics } = require('../services/portfolioService');
const { generateRecommendations } = require('../services/recommendationService');
const { simulateCompoundInterest } = require('../services/simulationService');

const router = express.Router();

router.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'fmpinvest-backend' });
});

router.post('/api/profile-analysis', (req, res, next) => {
  try {
    const payload = {
      userName: req.body.userName,
      age: Number(req.body.age),
      monthlyIncome: Number(req.body.monthlyIncome),
      monthlyExpense: Number(req.body.monthlyExpense),
      monthlyContribution: Number(req.body.monthlyContribution),
      emergencyReserveAmount: Number(req.body.emergencyReserveAmount),
      mainGoal: req.body.mainGoal,
      goalMonths: Number(req.body.goalMonths),
      knowledgeLevel: req.body.knowledgeLevel,
      riskTolerance: req.body.riskTolerance,
      investmentHorizon: req.body.investmentHorizon,
      hasEmergencyReserve: req.body.hasEmergencyReserve,
      liquidityPreference: req.body.liquidityPreference,
    };

    const analysis = analyzeProfile(payload);
    res.json(analysis);
  } catch (error) {
    next(error);
  }
});

router.post('/api/assets', (req, res, next) => {
  try {
    const asset = req.body || {};

    if (!String(asset.name || '').trim()) throw new Error('Nome do ativo e obrigatorio.');
    if (!String(asset.type || '').trim()) throw new Error('Tipo do ativo e obrigatorio.');
    if (!String(asset.risk || '').trim()) throw new Error('Nivel de risco e obrigatorio.');
    if (!String(asset.liquidity || '').trim()) throw new Error('Liquidez e obrigatoria.');
    if (!String(asset.objective || '').trim()) throw new Error('Objetivo do ativo e obrigatorio.');

    const value = Number(asset.value);
    if (!isValidNonNegativeNumber(value) || value <= 0) throw new Error('Valor investido deve ser maior que zero.');

    const expectedAnnualReturn =
      asset.expectedAnnualReturn === '' || asset.expectedAnnualReturn === null || asset.expectedAnnualReturn === undefined
        ? null
        : Number(asset.expectedAnnualReturn);

    if (expectedAnnualReturn !== null && (!isValidNonNegativeNumber(expectedAnnualReturn))) {
      throw new Error('Rentabilidade esperada anual nao pode ser negativa.');
    }

    res.json({
      message: 'Ativo validado com sucesso.',
      asset: {
        name: String(asset.name).trim(),
        ticker: String(asset.ticker || '').trim(),
        type: String(asset.type).trim().toLowerCase(),
        value,
        expectedAnnualReturn,
        risk: String(asset.risk).trim().toLowerCase(),
        liquidity: String(asset.liquidity).trim().toLowerCase(),
        objective: String(asset.objective).trim().toLowerCase(),
      },
    });
  } catch (error) {
    next(error);
  }
});

router.post('/api/portfolio-metrics', (req, res, next) => {
  try {
    const assets = req.body.assets || [];
    const investorProfile = req.body.investorProfile || null;
    const metrics = calculatePortfolioMetrics(assets, investorProfile);
    res.json(metrics);
  } catch (error) {
    next(error);
  }
});

router.post('/api/recommendations', (req, res, next) => {
  try {
    const profileAnalysis = req.body.profileAnalysis || null;
    const portfolioMetrics = req.body.portfolioMetrics || null;

    const recommendations = generateRecommendations({
      profileAnalysis,
      portfolioMetrics,
    });

    res.json({ recommendations });
  } catch (error) {
    next(error);
  }
});

router.post('/api/compound-interest', (req, res, next) => {
  try {
    const simulation = simulateCompoundInterest({
      initialAmount: Number(req.body.initialAmount),
      recurringContribution: Number(req.body.recurringContribution),
      monthlyRatePercent: Number(req.body.monthlyRatePercent),
      months: Number(req.body.months),
      targetAmount: Number(req.body.targetAmount || 0),
    });

    res.json(simulation);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
