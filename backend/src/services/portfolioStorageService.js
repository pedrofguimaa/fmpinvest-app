const fs = require('fs/promises');
const path = require('path');

const DATA_DIR = path.resolve(__dirname, '../../data');
const PORTFOLIO_FILE = path.join(DATA_DIR, 'portfolio.json');

async function garantirArquivoPortfolio() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(PORTFOLIO_FILE);
  } catch {
    await fs.writeFile(PORTFOLIO_FILE, '[]', 'utf-8');
  }
}

async function listarAtivos() {
  await garantirArquivoPortfolio();
  const raw = await fs.readFile(PORTFOLIO_FILE, 'utf-8');
  const parsed = JSON.parse(raw || '[]');
  const assets = Array.isArray(parsed) ? parsed : [];
  let precisaSincronizar = false;
  const normalizados = assets.map((asset) => {
    if (asset && asset.id) return asset;
    precisaSincronizar = true;
    return {
      ...asset,
      id: `${Date.now()}-${Math.floor(Math.random() * 100000)}`,
    };
  });
  if (precisaSincronizar) {
    await substituirAtivos(normalizados);
  }
  return normalizados;
}

async function substituirAtivos(assets) {
  await garantirArquivoPortfolio();
  const lista = Array.isArray(assets) ? assets : [];
  await fs.writeFile(PORTFOLIO_FILE, JSON.stringify(lista, null, 2), 'utf-8');
  return lista;
}

async function salvarAtivo(asset) {
  const assets = await listarAtivos();
  const novoAtivo = {
    ...asset,
    id: String(asset.id || `${Date.now()}-${Math.floor(Math.random() * 100000)}`),
  };
  assets.push(novoAtivo);
  await substituirAtivos(assets);
  return novoAtivo;
}

async function removerAtivoPorId(id) {
  const assets = await listarAtivos();
  const antes = assets.length;
  const atualizados = assets.filter((asset) => String(asset.id) !== String(id));
  await substituirAtivos(atualizados);
  return { removed: antes !== atualizados.length };
}

module.exports = {
  listarAtivos,
  salvarAtivo,
  removerAtivoPorId,
  substituirAtivos,
};
