# FMP Invest

MVP acadêmico para controle de perfil financeiro e carteira de investimentos de iniciantes.

## Funcionalidades atuais

- Análise de perfil do investidor (financeiro + comportamental)
- Cadastro detalhado de ativos
- Carteira com atualização imediata e remoção de ativos
- Métricas automáticas da carteira com score de 0 a 100
- Recomendações automáticas com base no perfil e carteira
- Simulador de juros compostos com meta financeira
- Placeholder de chatbot de suporte (sem integração real)

## Backend (Node.js + Express)

Rotas:

- `GET /health`
- `POST /api/profile-analysis`
- `POST /api/assets`
- `POST /api/portfolio-metrics`
- `POST /api/recommendations`
- `POST /api/compound-interest`

Serviços principais:

- `services/profileService.js`
- `services/portfolioService.js`
- `services/recommendationService.js`
- `services/simulationService.js`

## Frontend (HTML, CSS, JS puro)

Página única com seções:

- Visão geral
- Perfil financeiro
- Cadastro de ativos
- Carteira de investimentos
- Métricas da carteira
- Simulador de juros compostos
- Recomendações automáticas
- Chatbot de suporte (futuro)

## Como rodar

```bash
cd c:\Users\15427165789\Desktop\fmp-invest\fmpinvest-app\backend
npm install
npm start
```

Depois abra `frontend/index.html` no navegador (ou use Live Server).

## Próximos passos (Sprint 2)

- Persistência de dados (banco)
- Testes unitários e de integração
- Dashboard com gráficos
- Histórico mensal da carteira
- Início da integração real do chatbot
