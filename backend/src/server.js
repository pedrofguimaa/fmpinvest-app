const express = require('express');
const cors = require('cors');
const path = require('path');
const routes = require('./routes');

const app = express();
const PORT = process.env.PORT || 3000;
const frontendPath = path.join(__dirname, '..', '..', 'frontend');

app.use(cors());
app.use(express.json());
app.use(express.static(frontendPath));
app.use(routes);

app.use((_req, res) => {
  res.status(404).json({ error: 'Rota nao encontrada.' });
});

app.use((err, _req, res, _next) => {
  const statusCode = err.statusCode && Number.isInteger(err.statusCode) ? err.statusCode : 400;
  res.status(statusCode).json({
    error: err.message || 'Erro inesperado ao processar a requisicao.',
  });
});

app.listen(PORT, () => {
  console.log(`Servidor FMP Invest rodando em http://localhost:${PORT}`);
});
