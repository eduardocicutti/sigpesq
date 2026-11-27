# Validação final do SIGPesq

Ensaios locais em Windows, Node.js 26.13.0 e MySQL 8.4.9. Os testes de escrita usaram uma instância descartável em loopback na porta 33927. A base da demonstração ficou separada.

## Instalação e recuperação

- O cliente MySQL importou o esquema e a carga iniciais com UTF-8 e aplicou as duas migrações em uma instância nova.
- Uma nova importação em modo batch foi rejeitada no `CREATE DATABASE` com erro 1007. A consulta ao projeto sentinela retornou o mesmo código e título antes e depois.
- `mysqldump --single-transaction --routines --triggers --set-gtid-purged=OFF --no-tablespaces` gerou uma cópia do esquema de testes. A restauração em outro esquema confirmou 12 tabelas, 12 gatilhos, duas procedures e 16 projetos naquele snapshot. Essa evidência cobre uma recuperação pontual. A periodicidade diária de backup depende da execução do procedimento no ambiente que hospedar o banco.

## RNF07: ensaio local com 10 mil projetos

Banco separado com 10 mil projetos sintéticos. Cinco requisições HTTP autenticadas e sequenciais por caminho, da emissão até o recebimento do corpo completo.

| Caminho | Maior tempo de cinco amostras |
|---|---:|
| Painel | 24,5 ms |
| Listagem de projetos | 7,0 ms |
| Busca com filtro por situação | 16,6 ms |
| Paginação na página 500 | 11,2 ms |
| RF13 por identificador do docente | 49,2 ms |

O recorte medido ficou abaixo de 3 segundos. O resultado descreve este ambiente, estes caminhos e uma conexão de teste sem carga concorrente. Não abrange latência visual no navegador ou desempenho de todos os endpoints.

## Fluxos da aplicação

- [Bateria HTTP com banco real](../audit/tests/modulos-finais.mjs): sessões por perfil, projetos e troca de coordenação, equipes, cadastros e privacidade, financiamentos, produções, painel, auditoria e RF13–RF20. Dois apoios de R$ 60 para um financiamento de R$ 100 retornaram um sucesso e um conflito. A base preservou um vínculo e saldo de R$ 40.
- [Teste Firefox](../frontend/teste-navegador.mjs): painel, criação e edição de projeto, persistência após recarga, participante, financiamento e apoio, auditoria, alteração de situação, inclusão e saída de participante de equipe e cadastro de produção. A digitação de letras no valor monetário foi rejeitada.
- A regressão demonstrativa percorreu 81 destinos em quatro perfis e três larguras. Esse recorte não equivale à verificação integral de acessibilidade.
- A rodada adicional no Firefox confirmou troca de coordenação pelo Administrador, edição e exclusão de produção pelo Coordenador e RF19 pelo Gestor. Financiamentos abriu para Gestor sem controles administrativos.
- Em clone limpo do código, `npm ci` passou nos dois projetos, assim como cinco testes de backend, lint e build dos modos conectado e demonstrativo. Os três testes de serviços frontend passaram na cópia de desenvolvimento.
