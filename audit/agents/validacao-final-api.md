# Validação final da API e do banco

MySQL Community 8.4.9, Node 26.13.0 e Windows. Instância em loopback na porta 33927, com @@datadir verificado no diretório temporário sigpesq-validacao. Nenhuma escrita no banco de uso do usuário.

| Ensaio | Resultado |
|---|---|
| Projetos e equipes | Criação, edição pelo Coordenador, alteração de situação, bloqueio de exclusão com vínculos, inclusão e encerramento, datas inválidas, duplicidade e autorização exercitados. Troca pela Administração preservou vínculo anterior, abriu o novo e retirou do coordenador anterior o direito de mudar a situação. |
| Cadastros | Participante criado, editado e excluído. CPF retornado à Administração e omitido para Participante. Exclusão de cadastro com vínculos bloqueada. Agência criada, editada e consultada. |
| Financiamento | Destinações concorrentes de R$ 60,00 num financiamento de R$ 100,00 produziram HTTP 201 e 409, com um único apoio e saldo de R$ 40,00. Redução abaixo do destinado e exclusão com apoio bloqueadas. Remoção do apoio seguida de exclusão passou. |
| Produção | Cadastro com dois autores, validação de pelo menos um autor, rollback de edição ao informar autor inexistente, inversão da ordem e vínculo com dois projetos. Inclusão de projeto de outro coordenador bloqueada. Exclusão e registro na auditoria confirmados. |
| Consultas e painel | RF13–RF20, incluindo ambos os recortes de RF20. Gestor consultou todos, Participante recebeu 403 de RF16 a RF20 e 200 de RF13 a RF15. Totais do painel conferidos para Administração e Coordenação. |
| Reimportação | O comando batch de carga retornou código 1 e erro MySQL 1007 no CREATE DATABASE quando a base existia. Contagens das sentinelas permaneceram em 5 projetos e 8 contas naquele momento. |
| Backup/restauração | Backup com mysqldump usando --single-transaction --routines --triggers --no-tablespaces, restaurado no schema separado sigpesq_restauro. As contagens de 20 projetos, 53 participações e 15 contas coincidiram com a origem no momento do ensaio. A restauração continha 12 tabelas, 12 triggers e 2 procedures. Nenhuma rotina diária foi agendada. |
| Desempenho local | Com 10.000 projetos no schema restaurado, seis caminhos HTTP tiveram máximos de 19,9 a 39,5 ms em cinco repetições após aquecimento por caminho. Ambiente loopback, Ryzen 7 5700G e aproximadamente 16 GB de memória. Amostra dirigida, sem concorrência e com distribuição sintética. Não representa carga de produção, telas completas ou todos os relatórios. |

Reprodução na raiz: defina DB_HOST=127.0.0.1, DB_PORT=33927, DB_USER=root e a base descartável DB_NAME=sigpesq; execute node audit/tests/modulos-finais.mjs. Para a amostra de 10.000 projetos, use a cópia descartável restaurada com DB_NAME=sigpesq_restauro e execute node audit/tests/desempenho-projetos.mjs. Ambos inserem dados exclusivamente para teste e verificam identidade da instância.

A seleção da operação de apoio passou a ser explícita na rota, preservando o comportamento com barra final. A bateria concorrente foi reexecutada usando uma URL com barra final e outra sem barra. Os cinco testes unitários do backend passaram após a mudança.
