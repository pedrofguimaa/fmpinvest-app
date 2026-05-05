const express = require('express');
const {
  listarAtivos,
  salvarAtivo,
  removerAtivoPorId,
  substituirAtivos,
} = require('../services/portfolioStorageService');

const router = express.Router();

function validarAtivo(asset = {}) {
  if (!String(asset.categoria || asset.category || '').trim()) {
    throw new Error('Categoria do ativo e obrigatoria.');
  }
  if (!String(asset.nome || asset.name || '').trim()) {
    throw new Error('Nome do ativo e obrigatorio.');
  }
  const valorInvestido = Number(asset.valorInvestido ?? asset.value);
  if (!(valorInvestido > 0)) {
    throw new Error('Valor investido deve ser maior que zero.');
  }
  if (!String(asset.risco || asset.risk || '').trim()) {
    throw new Error('Risco do ativo e obrigatorio.');
  }
}

router.get('/api/portfolio/assets', async (_req, res, next) => {
  try {
    const assets = await listarAtivos();
    res.json({ assets });
  } catch (error) {
    next(error);
  }
});

router.post('/api/portfolio/assets', async (req, res, next) => {
  try {
    const asset = req.body || {};
    validarAtivo(asset);
    const salvo = await salvarAtivo(asset);
    res.status(201).json({ asset: salvo });
  } catch (error) {
    next(error);
  }
});

router.delete('/api/portfolio/assets/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { removed } = await removerAtivoPorId(id);
    if (!removed) return res.status(404).json({ error: 'Ativo nao encontrado.' });
    return res.json({ message: 'Ativo removido com sucesso.' });
  } catch (error) {
    next(error);
  }
});

router.delete('/api/portfolio/assets', async (_req, res, next) => {
  try {
    await substituirAtivos([]);
    res.json({ message: 'Todos os ativos foram removidos.' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
