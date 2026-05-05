# FMP Invest

MVP acadêmico para controle de perfil financeiro e carteira de investimentos de iniciantes.

## Funcionalidades atuais

- Análise de perfil do investidor (financeiro + comportamental)
- Cadastro detalhado de ativos com persistência em arquivo JSON
- Carteira com atualização imediata e remoção de ativos
- Métricas automáticas da carteira com score de 0 a 100
- Recomendações automáticas com base no perfil e carteira
- Simulador de juros compostos com meta financeira
- Placeholder de chatbot de suporte (sem integração real)

## Backend (Node.js + Express)

Rotas:

- `GET /health`
- `GET /api/portfolio/assets`
- `POST /api/portfolio/assets`
- `DELETE /api/portfolio/assets/:id`
- `DELETE /api/portfolio/assets` (limpeza total opcional)
- `POST /api/profile-analysis`
- `POST /api/portfolio-metrics`
- `POST /api/recommendations`
- `POST /api/compound-interest`

Serviços principais:

- `services/profileService.js`
- `services/portfolioService.js`
- `services/portfolioStorageService.js`
- `services/recommendationService.js`
- `services/simulationService.js`

Persistência local:

- Arquivo: `backend/data/portfolio.json`
- Formato: lista JSON de ativos
- Uso atual: simulação de repositório simples para projeto acadêmico

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
cd c:\Users\Pichau\Desktop\fmpinvest-app\fmpinvest-app\backend
npm install
npm start
```

Depois abra `frontend/index.html` no navegador (ou use Live Server).

## Fluxo de persistência de ativos

- Ao abrir o frontend: busca `GET /api/portfolio/assets` e popula a carteira.
- Ao adicionar ativo: envia `POST /api/portfolio/assets` e salva no `portfolio.json`.
- Ao remover ativo: envia `DELETE /api/portfolio/assets/:id` e remove do `portfolio.json`.
- Após cada operação: carteira, métricas, gráficos e recomendações são recalculados.

## Limitações atuais

- Persistência baseada em arquivo JSON local (sem banco de dados).
- Sem autenticação e sem separação por usuário.
- Escritas concorrentes em alta escala não são foco desta versão.

## Próximos passos (Sprint 2)

- Migração da persistência para banco de dados relacional ou NoSQL
- Testes unitários e de integração
- Dashboard com gráficos
- Histórico mensal da carteira
- Início da integração real do chatbot
