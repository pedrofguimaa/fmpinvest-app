# FMP Invest

MVP acadêmico para controle de perfil financeiro e carteira de investimentos de iniciantes.

## Sprint 1 — Pré-Projeto

A Sprint 1 definiu a base do projeto, incluindo problema, solução proposta, público-alvo, tecnologias previstas, riscos iniciais e escopo planejado para evolução.

### Integrantes do grupo

| Nome | RA | Curso | GitHub |
| --- | --- | --- | --- |
| Felipe de Menezes Sternadt dos Santos | 10723113315 | Sistemas de Informação | <https://github.com/Felipe-sternadt> |
| Matheus Subtil de Oliveira | 10723112274 | Sistemas de Informação | <https://github.com/MSdOliveira> |
| Guilherme Van der Laan Dilli Rosa | 1072316305 | Sistemas de Informação | <https://github.com/Guivander> |
| Pedro Ferreira Guimarães | 10723111619 | Sistemas de Informação | <https://github.com/pedrofguimaa> |

### Repositório e tecnologias previstas

- Repositório: <https://github.com/pedrofguimaa/fmpinvest-app>
- Tecnologias previstas: HTML, CSS, JavaScript, Node.js, Express e API ChatGPT.

### Canvas do projeto

Problema:

Investidores iniciantes não possuem controle estruturado da própria carteira e não conseguem avaliar métricas como risco, diversificação e qualidade dos investimentos, resultando em decisões financeiras pouco embasadas.

Solução proposta:

Desenvolver uma plataforma web de controle de investimentos que permite registrar renda, aportes mensais e ativos, calcular automaticamente métricas da carteira, como score, risco e diversificação, e gerar recomendações baseadas em regras implementadas no backend. O projeto também prevê um chatbot integrado para suporte ao usuário.

Usuários-alvo:

- Investidores iniciantes.
- Estudantes interessados em finanças pessoais.
- Jovens adultos organizando sua vida financeira.
- Usuários que não utilizam ferramentas profissionais de investimento.

Diferenciais planejados:

- Motor próprio de análise financeira implementado no backend.
- Sistema de score da carteira baseado em regras quantitativas testáveis.
- Simulador de crescimento com juros compostos.
- Geração automática de recomendações com base em dados do usuário.
- Arquitetura com separação entre lógica e interface.
- Testes unitários cobrindo regras de negócio.
- Relatórios automatizados de cobertura de testes.
- Integração com chatbot via API apenas para suporte, sem interferência na lógica principal.

Riscos e incertezas identificados:

- Definição adequada das regras de cálculo do score da carteira.
- Complexidade na implementação das regras de recomendação.
- Integração e tratamento de respostas da API do chatbot.
- Garantia de cobertura de testes suficiente desde as primeiras sprints.
- Coordenação da equipe no uso de versionamento, incluindo branches, merges e commits.

### Escopo inicial previsto para a Sprint 2

| Funcionalidade | Testável como? |
| --- | --- |
| Cálculo da taxa de investimento mensal | Teste unitário validando o cálculo com diferentes cenários, como renda, valores negativos e valores válidos. |
| Cálculo do score da carteira | Teste unitário validando regras de diversificação e limite de concentração por ativo. |
| Simulador de juros compostos | Teste unitário comparando o resultado com valores matematicamente esperados para diferentes períodos e taxas. |

## Sprint 2 — Relatório de Evolução

Na Sprint 2, o projeto evoluiu de uma estrutura inicial para um fluxo principal funcional, com backend, frontend, persistência local, testes automatizados e uso organizado de controle de versão.

Entregas implementadas nesta sprint:

- Fluxo principal da aplicação funcionando.
- Análise de perfil do investidor com critérios financeiros e comportamentais.
- Cadastro, listagem e remoção de ativos da carteira.
- Persistência dos ativos em arquivo JSON local.
- Cálculo automático de métricas da carteira.
- Geração de score da carteira de 0 a 100.
- Recomendações automáticas com base no perfil e na composição da carteira.
- Simulador de juros compostos com aporte mensal, taxa e meta financeira.
- Interface web em página única, integrada ao backend.
- Testes unitários automatizados com Jest para as principais regras de negócio.
- Histórico de commits, branches e pull requests organizados no GitHub.

## Funcionalidades atuais

- Análise de perfil do investidor (financeiro + comportamental).
- Cadastro detalhado de ativos com persistência em arquivo JSON.
- Carteira com atualização imediata e remoção de ativos.
- Métricas automáticas da carteira com score de 0 a 100.
- Recomendações automáticas com base no perfil e carteira.
- Simulador de juros compostos com meta financeira.
- Placeholder de chatbot de suporte (sem integração real).

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
cd backend
npm install
npm start
```

Depois acesse `http://localhost:3000` no navegador.

## Fluxo de persistência de ativos

- Ao abrir o frontend: busca `GET /api/portfolio/assets` e popula a carteira.
- Ao adicionar ativo: envia `POST /api/portfolio/assets` e salva no `portfolio.json`.
- Ao remover ativo: envia `DELETE /api/portfolio/assets/:id` e remove do `portfolio.json`.
- Após cada operação: carteira, métricas, gráficos e recomendações são recalculados.

## Testes automatizados

Os testes automatizados do backend usam Jest e validam regras de negócio do sistema, sem foco em layout ou interface visual.

Cobertura principal desta suíte:

- perfil do investidor;
- métricas da carteira;
- score da carteira;
- simulador de juros compostos;
- recomendações automáticas.

Como rodar:

```bash
cd backend
npm test
```

Resultado validado na Sprint 2:

- 4 suítes de testes executadas.
- 23 testes automatizados aprovados.
- Testes unitários cobrindo perfil do investidor, carteira, score, recomendações e simulação de juros compostos.

Relatório de testes unitários:

- Arquivo gerado pelo terminal: `backend/relatorio_ultra_completo.txt`
- Relatório HTML de cobertura: `backend/coverage/lcov-report/index.html`
- Cobertura geral registrada: 83,41% de statements, 64,16% de branches, 100% de funções e 89,82% de linhas.
- Suítes aprovadas no relatório: `profileService`, `portfolioService`, `simulationService` e `recommendationService`.

## Controle de versão e padrão de commits

O grupo utiliza Git e GitHub para controle de versão, com commits descritivos, branches por tipo de alteração e pull requests para integração das mudanças.

Branches utilizadas no projeto:

- `feat/dashboard-visual-update`
- `fix/ajustes-cadastro-ativos`
- `test/testes-automatizados`
- `docs/workflow-config`
- `chore/placeholders-simulador`
- `doc-atualiza-readme-sprints`
- `doc-relatorio-testes-unitarios`

Branch atual de documentação:

- `doc-relatorio-testes-unitarios`: atualização do README com o relatório de testes unitários, cobertura Jest e registro dos arquivos gerados. Esta branch deve ser enviada para o GitHub e integrada à `main` por meio de pull request, após revisão e merge por outro integrante.

O grupo adotou Conventional Commits:

- `docs`: documentação
- `feat`: nova funcionalidade
- `fix`: correções
- `chore`: organização/configuração
- `test`: testes

Exemplos no histórico:

- `feat: implementa funcionalidades principais da sprint`
- `test: adiciona testes automatizados`
- `fix: corrige cadastro de ativos e selects`
- `chore: adiciona placeholders no simulador`
- `docs: adiciona workflow e padrão de commits no README`

## Limitações atuais

- Persistência baseada em arquivo JSON local (sem banco de dados).
- Sem autenticação e sem separação por usuário.
- Escritas concorrentes em alta escala não são foco desta versão.
- Chatbot ainda sem integração real.
