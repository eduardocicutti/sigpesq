# Uso das skills

Este arquivo organiza a utilização de skills existentes; não cria ou instala novas skills. Ler a versão disponível do SKILL.md antes de executar cada fluxo.

## Recursos solicitados e instalados em 21/11/2026
- Unslop UI: C:\Users\eduar\.codex\skills\unslop-ui. Fonte: https://github.com/felipebasurto/unslop-ui, commit 32279dec96ef20a4a0ac47a5b113e48dda6b3b6e. Revisão de textos e decorações quando solicitada; não executar limpeza durante o simples planejamento.
- Impeccable: C:\Users\eduar\.codex\skills\impeccable. Fonte: https://github.com/pbakaus/impeccable, commit b49177d32788f2dc585c42831d845dacf1ebed2c. Skill com referências e scripts para planejamento e revisão de interface; ler instruções ao utilizar.
- Instalação feita por download dos repositórios oficiais e cópia das pastas das skills, pois o helper Python não encontrou interpretador disponível. Scripts das skills não foram executados; instalação não equivale a validação de execução.
- Palletism: https://palletism.art/connect é um serviço MCP, não uma skill para baixar. Conexão pendente de chave pessoal; nenhum servidor foi configurado. A chave deve ficar fora do projeto. Instruções oficiais: https://palletism.art/connect.md.
- Usar Impeccable para orientar decisões de interface e Unslop UI para revisão específica; evitar executar fluxos sobrepostos de várias skills sem necessidade. Requisitos acadêmicos e referências do usuário continuam sendo a base do trabalho.

| Momento | Skill | Uso previsto |
|---|---|---|
| Leitura das entregas em PDF | pdf:pdf | Extrair conteúdo e conferir páginas, diagramas e tabelas visualmente quando necessário. |
| Leitura das entregas em Word | documents:documents | Consultar o DOCX e verificar elementos que dependam do layout. |
| Planejamento visual | product-design:index | Direcionar o fluxo apropriado a partir do objetivo e das referências. Índice consultado na organização inicial. |
| Exploração visual, se necessária | product-design:ideate | Explorar alternativas a partir das imagens; seguir o contexto/preflight solicitado pelo índice antes de executar. |
| Implementação após definição visual | product-design:image-to-code | Traduzir o alvo visual escolhido para React, respeitando a stack confirmada. |
| Revisão da experiência implementada | product-design:audit | Avaliar fluxos a partir de capturas reais e registrar problemas verificáveis. |

## Sequência e limites
- Primeiro ler as entregas; depois cruzar requisitos e analisar referências.
- As duas imagens foram recebidas e salvas em referencias/. A direção visual ainda será consolidada.
- Skills de ideação e implementação ficam reservadas para suas etapas; não foram executadas nesta preparação.
- Seguir os pré-requisitos e referências do índice Product Design ao iniciar um fluxo visual.
- Skills não substituem testes funcionais, contrato da API nem validação do banco.
- Não usar Sites, Canva ou geração de imagens apenas por estarem disponíveis. Aplicar somente quando a tarefa exigir e respeitando a stack escolhida.
- Não usar skill-creator para escrever AGENTS.md: instruções do projeto e skills reutilizáveis são artefatos diferentes.
