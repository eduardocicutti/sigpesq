# SIGPesq — Sistema de Gerenciamento de Projetos de Pesquisa Universitários

**Universidade Federal do Espírito Santo — Departamento de Computação e Eletrônica**

**Disciplina:** Banco de Dados · **Semestre:** 2026/2

**Equipe:** preencher a identificação na capa a partir da versão aprovada pelo grupo.

Texto-base para consolidação do relatório acadêmico. Antes da exportação, incorporar as figuras originais indicadas nas seções 3 a 5 e conferir identificação, paginação, legendas e legibilidade no PDF.

## 1. Identificação

O SIGPesq foi desenvolvido a partir do [estudo de caso da disciplina](fontes/Case_SIGPesq.pdf). O sistema demonstra a passagem de requisitos a um modelo conceitual, sua transformação em relações e a implementação com restrições em um SGBD.

## 2. Introdução

A universidade fictícia do Case mantém informações da pesquisa em planilhas separadas. Isso dificulta identificar a coordenação, acompanhar a vigência de apoios e relacionar produções à equipe e aos projetos. O objetivo do SIGPesq é reunir esses dados em um banco relacional, preservando consistência e histórico. O sistema gerencia projetos, participação, agências, financiamento, produção e autoria, com consultas por critérios relevantes ao acompanhamento da pesquisa.

O MySQL implementa as chaves, as restrições e as consultas relacionais. O servidor Express centraliza o acesso ao banco, e a interface React apresenta os formulários e os resultados da API. O escopo abrange uso acadêmico local, com dados de demonstração e quatro perfis de acesso.

## 3. Requisitos e modelos de software

Os requisitos funcionais RF01–RF23 abrangem manutenção e consulta de projetos, participantes, financiamentos e produções, além de autenticação. A integridade referencial, o controle de permissões, a auditoria, o desempenho e a recuperação de dados são verificados separadamente dos fluxos de entrada de dados.

O Administrador realiza manutenção dos cadastros e acompanha a auditoria. O Coordenador responde pelas operações dos projetos sob sua coordenação. Gestor e Participante têm acesso de consulta conforme suas permissões. A [matriz de rastreabilidade](ENTREGA.md) associa os fluxos à implementação e explicita os recortes das consultas.

**Figuras e fontes a incorporar:** diagrama e fichas de casos de uso de `02_SIGPesq_Modelo_de_Casos_de_Uso.pdf` ou da versão acordada pelo grupo, modelo de classes de `03_SIGPesq_Modelo_de_Classes.pdf` e requisitos consolidados da entrega de requisitos. Os arquivos acadêmicos originais ficam na pasta do trabalho. A versão local denominada `SIGPesq-final.docx` contém o Modelo de Casos de Uso, com sete capítulos, e serve como fonte para esta seção.

## 4. Modelagem conceitual

Cada projeto possui exatamente um docente coordenador principal. Um docente pode coordenar diversos projetos. Projeto e participante formam uma relação N:N. O vínculo registra função, início e fim, permitindo que uma pessoa atue em projetos simultâneos e participe de um mesmo projeto em períodos distintos.

Cada financiamento pertence a uma agência e pode apoiar diversos projetos. Um projeto pode existir sem financiamento ou receber mais de um. O vínculo entre financiamento e projeto informa o valor destinado. Uma produção científica possui autores cadastrados e vínculos com projetos. A autoria registra a ordem de publicação, e a produção deve ser gravada com pelo menos um autor e um projeto.

**Figura a incorporar:** MER em Peter Chen da entrega `SIGPesq_Modelo_deDados-1.pdf`. Na legenda, explicitar que o identificador usado internamente no banco e o código usado pelos pesquisadores são atributos distintos na implementação.

## 5. Modelagem lógica e dicionário resumido

**Figura a incorporar:** [diagrama em pé de galinha da versão instalada](MODELO-LOGICO.md), conferido contra as chaves abaixo e as [migrações](../backend/migrations/). A entrega original do modelo de dados permanece como referência acadêmica.

| Relação | Identificação e referências | Atributos de domínio |
|---|---|---|
| `participante` | PK `id_participante INT UNSIGNED` | Nome `VARCHAR(150)`, e-mail institucional `VARCHAR(120)` e CPF `CHAR(11)`, ambos únicos, tipo `VARCHAR(10)`. |
| `projeto` | PK `codigo INT UNSIGNED`. FK `id_coordenador` para participante docente. | Código público `VARCHAR(20)` único e imutável, título `VARCHAR(200)`, descrição `TEXT`, início e término `DATE`, situação `VARCHAR(15)`. |
| `participacao` | PK composta `(codigo_projeto, id_participante, data_entrada)`. As duas primeiras colunas referenciam projeto e participante. | Função `VARCHAR(20)` e saída `DATE` opcional. |
| `agencia_financiadora` | PK `id_agencia INT UNSIGNED` | Sigla `VARCHAR(15)` única e nome `VARCHAR(150)`. |
| `financiamento` | PK `id_financiamento INT UNSIGNED`. FK `id_agencia`. | Tipo de fomento `VARCHAR(10)`, valor total `DECIMAL(15,2)`, início e fim da vigência `DATE`. |
| `financiamento_projeto` | PK composta `(id_financiamento, codigo_projeto)`, ambas FKs | Valor destinado `DECIMAL(15,2)` positivo. |
| `producao_cientifica` | PK `id_producao INT UNSIGNED` | Título `VARCHAR(250)`, tipo `VARCHAR(20)`, ano `SMALLINT UNSIGNED`, meio de divulgação `VARCHAR(200)`. |
| `producao_projeto` | PK composta `(id_producao, codigo_projeto)`, ambas FKs | Associação da produção ao projeto. |
| `autoria` | PK composta `(id_producao, id_participante)`, ambas FKs | Ordem `TINYINT UNSIGNED` igual ou maior que 1 e única dentro de uma produção. |
| `usuario` | PK `id_usuario INT UNSIGNED`. FK opcional e única `id_participante`. | Login `VARCHAR(40)` único, hash de senha `VARCHAR(255)`, perfil `VARCHAR(15)` e indicador de conta ativa. |
| `sessao` | PK `token_hash BINARY(32)`, FK `id_usuario` | Expiração `DATETIME`, adicionada pela migração 002. |
| `log_auditoria` | PK `id_log BIGINT UNSIGNED`, FK `id_usuario` | Data/hora, tabela, operação, chave do registro e descrição. |

As colunas são obrigatórias, exceto as explicitamente indicadas como opcionais. O [DDL](../sigpesq_criacao_carga.sql) é a referência para nomes completos, valores padrão, índices e ação de cada FK.

## 6. Implementação física e validação

O [script de criação e carga](../sigpesq_criacao_carga.sql) instala o esquema inicial e inclui dados de exemplo. A migração 001 acrescenta o código público e adapta a rotina de cadastro de projeto para que a criação e seu registro de auditoria possam compartilhar a transação do backend. A migração 002 acrescenta as sessões. A [instalação](../backend/README.md) descreve a ordem e os comandos.

As FKs e os `CHECK` preservam referências, faixas de valores, datas e estados. A API usa transações para manter gravações e auditoria juntas. Na destinação de recursos, o bloqueio do financiamento e a regra de saldo evitam comprometer valor superior ao disponível. Na produção, a API verifica as associações obrigatórias e grava os autores em ordem na mesma transação.

Na [validação de entrega](validacao-entrega.md), uma base descartável recebeu a instalação e as migrações. A repetição do script preservou o projeto sentinela ao parar no erro de base já existente. A restauração em outro esquema confirmou a estrutura e os dados do snapshot. Com 10 mil projetos sintéticos, os cinco caminhos HTTP amostrados ficaram abaixo de 3 segundos no ambiente local. Esse ensaio descreve a amostra em sequência; a recuperação demonstrada foi pontual, e a periodicidade de backup depende da rotina operacional.

## 7. Consultas SQL

O script principal preserva os exemplos RF13–RF20 em sua seção final. O backend aplica os filtros e as permissões da aplicação, com parâmetros fornecidos pelo usuário. A consulta RF19 soma cada financiamento uma vez, evitando multiplicar o valor total quando há vários projetos apoiados. A RF20 conta projetos distintos por participante; o modo vigente filtra pela data de referência, e o modo histórico considera todos os períodos.

Na carga inicial de referência, a rodada anterior documentou 10 projetos com coordenação (RF17), 4 produções na amostra por ano e tipo (RF18), 5 agências na agregação (RF19) e 17 participantes em múltiplos projetos no recorte histórico (RF20). São contagens dos exemplos com os filtros da carga original. Para anexar capturas à entrega, executar novamente os exemplos na base de apresentação e identificar filtros e recorte no título de cada resultado.

## 8. Considerações finais

O modelo relacional permitiu representar vínculos temporais, autoria ordenada e apoiadores compartilhados sem perder a referência ao projeto. A distinção entre chave física e código público preserva a integridade das relações e a identificação acessível aos utilizadores. A auditoria registra as alterações de negócio e o sistema aplica o perfil em cada operação.

A periodicidade de backups, o comportamento sob carga concorrente em produção e a extensão da regra de manutenção de autoria após troca de coordenação merecem verificação no ambiente que assumir o sistema. A [lista de conferência](ENTREGA.md) indica as verificações acadêmicas e o roteiro de apresentação.
