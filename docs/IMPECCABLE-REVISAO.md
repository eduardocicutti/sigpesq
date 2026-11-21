# Revisão do frontend com Impeccable

Data da revisão: 21/11/2026  
Projeto: SIGPesq  
Área analisada: `frontend/src/`

## Escopo

A revisão avaliou o frontend existente, composto pelo acesso de demonstração, painel, listagem de projetos, busca e detalhe de projeto. Foram consideradas as orientações das skills Impeccable e Unslop UI, além das instruções do projeto em `AGENTS.md` e `docs/SKILLS.md`.

## Método e limitações

O engine da Impeccable foi instalado e o comando `impeccable context` foi executado com sucesso.

O detector automático foi executado sobre:

- `frontend/src/Sigpesq.jsx`
- `frontend/src/App.jsx`
- `frontend/src/main.jsx`

Resultado do detector: `[]`.

Esse resultado significa que nenhum padrão determinístico foi encontrado nesses arquivos. O detector não substitui a inspeção visual, a revisão de acessibilidade ou a análise da experiência.

A crítica anterior foi feita em contexto único. A revisão completa da Impeccable prevê dois avaliadores independentes: um para design e outro para detector/evidências de navegador. A ferramenta de subagentes estava disponível no ambiente, mas não foi utilizada naquela rodada. Não houve inspeção em navegador nesta revisão.

## Resultado geral

Classificação: aceitável, com trabalho significativo antes da entrega.

| Dimensão | Nota | Observação |
|---|---:|---|
| Acessibilidade | 3/4 | Há `label`, `aria-current`, `aria-pressed`, `role="status"` e foco visível. Faltam validação de contraste e inspeção real com teclado. |
| Performance | 3/4 | Aplicação pequena e sem animações pesadas. A busca dispara carregamento a cada alteração de texto. |
| Theming | 1/4 | Há cores diretamente no CSS e conflito com o tema escuro residual do Vite. |
| Responsividade | 2/4 | Existe breakpoint para celular, mas faltam verificações em viewport real. |
| Integridade da implementação | 2/4 | A estrutura inicial é coerente, mas ainda há mock explícito, CSS residual e poucos fluxos implementados. |
| **Total** | **11/20** | **Aceitável** |

## Problemas prioritários

### P1 — Textos com codificação quebrada

Arquivo: `frontend/src/Sigpesq.jsx`.

Foram identificados textos como `Conclu?do`, `N?o foi poss?vel` e `Carregando projetos?`. Isso prejudica diretamente a leitura da interface em português.

Correção recomendada: garantir que os arquivos estejam em UTF-8 e substituir os textos corrompidos por:

- `Concluído`
- `Não foi possível carregar os projetos.`
- `Carregando projetos…`

Comando Impeccable relacionado: `$impeccable clarify`.

### P1 — CSS residual do template Vite

Arquivo: `frontend/src/index.css`.

O arquivo ainda contém tema escuro automático, variáveis roxas, largura fixa de `1126px`, estilos de exemplo e regras que podem conflitar com `sigpesq.css`.

Correção recomendada: remover estilos não utilizados do template e centralizar as decisões visuais do SIGPesq em tokens próprios.

Comando Impeccable relacionado: `$impeccable distill`.

### P1 — Demonstração com aparência de autenticação real

O seletor de perfil simula uma autenticação e o cabeçalho informa `Demonstração`, mas o fluxo não explica claramente que não existe sessão real nem persistência.

Correção recomendada: manter a identificação de demonstração visível e incluir uma mensagem curta e precisa na tela de acesso, sem sugerir autenticação real.

Comandos Impeccable relacionados: `$impeccable clarify` e `$impeccable harden`.

### P2 — Busca sem controle de envio

Cada alteração no campo de busca dispara novamente o serviço simulado. Em uma futura integração com a API, isso pode gerar chamadas excessivas.

Correção recomendada: pesquisar ao pressionar Enter ou após um pequeno debounce, mantendo o estado de carregamento e o resultado anterior durante a nova consulta.

Comando Impeccable relacionado: `$impeccable optimize`.

### P2 — Abas incompletas

As abas Produções e Financiamentos exibem sempre `Nenhum registro de demonstração nesta seção.`. Isso torna o fluxo artificial e não demonstra os estados previstos no planejamento.

Correção recomendada: implementar estados vazios específicos para cada seção e, depois, dados simulados conforme os contratos de produções e financiamentos.

Comando Impeccable relacionado: `$impeccable harden`.

### P2 — Sistema visual genérico

A combinação de cartões brancos, bordas cinzas, azul institucional e gradiente no login é funcional, mas poderia pertencer a qualquer painel administrativo. Ainda falta uma decisão visual própria para o SIGPesq.

Correção recomendada: consolidar tipografia, escala de espaçamento, estados de situação, hierarquia das tabelas e tratamento visual dos detalhes de projeto, sempre respeitando a direção já registrada no planejamento.

Comandos Impeccable relacionados: `$impeccable shape`, `$impeccable layout` e `$impeccable polish`.

## Pontos positivos

- A navegação atual é simples e reconhecível.
- Os rótulos dos campos e o foco visível fornecem uma boa base de acessibilidade.
- O serviço de projetos está separado da tela e segue o formato inicial do contrato da API.
- O layout possui uma adaptação inicial para telas estreitas.
- O detector automático não encontrou padrões determinísticos de interface gerada por IA nos arquivos analisados.

## Padrões de interface associados a geração por IA

Os seguintes sinais foram observados na inspeção manual:

- Uso de cartões para quase todos os agrupamentos.
- Gradiente vertical genérico na tela de acesso.
- Texto de demonstração repetido em mais de uma área.
- Perfil fictício exposto como seletor de login.
- Abas que mostram sempre o mesmo estado vazio.
- Números fixos no resumo, sem contexto temporal.
- CSS original do template misturado ao CSS da aplicação.

Esses itens não foram todos detectados automaticamente; são observações da inspeção de código e da aplicação das regras de design da Impeccable e da Unslop UI.

## Ordem recomendada de correção

1. `$impeccable clarify` — corrigir textos e explicar o modo de demonstração.
2. `$impeccable distill` — remover CSS residual do Vite e consolidar tokens.
3. `$impeccable harden` — completar estados, permissões e abas.
4. `$impeccable adapt` — verificar 360, 768 e 1440 px.
5. `$impeccable polish` — executar a revisão final.

## Conclusão da rodada

O frontend tem uma base funcional inicial, mas ainda não deve ser considerado visualmente finalizado. Os problemas mais urgentes são a codificação quebrada dos textos, a presença de CSS residual do Vite e a distinção insuficiente entre demonstração e autenticação real.

Para uma próxima rodada completa, usar dois agentes independentes, executar o detector novamente e realizar inspeção em navegador com a aplicação renderizada.
