# Entrega e rastreabilidade do SIGPesq

O [estudo de caso da disciplina](fontes/Case_SIGPesq.pdf) define os módulos e os artefatos da entrega. Os requisitos consolidados e os casos de uso do grupo detalham perfis, permissões e regras de negócio. A referência de execução é o SQL do repositório acompanhado das migrações, e as regras de acesso são aplicadas no backend.

## Visão dos fluxos conectados

| Requisito | Fluxo | Implementação de referência | Perfis |
|---|---|---|---|
| RF01–RF03 | Projetos, situação e coordenação | [Projetos](../backend/projetos.js) | Leitura autenticada. Administrador define ou troca coordenação. Administrador e Coordenador cadastram e editam conforme a propriedade do projeto. Situação depende do Coordenador responsável. Vínculos impedem exclusão. |
| RF04 e RF07 | Participantes e agências | [Cadastros](../backend/cadastros.js) | Leitura autenticada e manutenção administrativa. CPF restrito ao Administrador. Exclusão de participante vinculado é bloqueada. |
| RF05–RF06 | Vínculos e saída de membros | [Projetos](../backend/projetos.js) | Coordenação responsável inclui ou encerra o vínculo, com preservação do histórico. A saída do titular da coordenação é tratada pela troca administrativa. |
| RF08–RF09, RF22 | Financiamentos e apoios | [Financiamentos](../backend/financiamentos.js) | Administrador mantém os dados. Gestor e Administrador consultam. O projeto pode ter vários financiamentos, e cada financiamento pode apoiar vários projetos. |
| RF10–RF12, RF23 | Produção, projetos e autoria | [Produções](../backend/producoes.js) | Leitura autenticada. A coordenação mantém produção quando responde por todos os projetos vinculados. A regra aplicada à troca posterior de coordenação merece validação acadêmica. |
| RF13–RF20 | Consultas | [Consultas](../backend/consultas.js) | RF13–RF15 para perfis autenticados, RF16 para Administrador e Gestor, RF17–RF20 para Gestor. O RF20 separa vínculos vigentes de todo o histórico. |
| RF21, RNF03–04 | Sessão e autorização | [Sessão](../backend/sessao.js) | Conta ativa, verificação de senha por hash, sessão com expiração e autorização conforme perfil. |
| RNF09 | Registro e consulta à auditoria | [Consultas](../backend/consultas.js) | Gravações são registradas no banco. Consulta exclusiva do Administrador aos 100 eventos mais recentes. |
| Complementar | Visão inicial por situação e prazo | [Projetos](../backend/projetos.js) | O painel mostra totais por situação e projetos em andamento próximos do término. Para o Coordenador, restringe aos projetos sob sua coordenação. |

## Esquema que deve constar no relatório

Use o [script principal](../sigpesq_criacao_carga.sql) e as [migrações](../backend/migrations/) como fontes físicas. O modelo conceitual deve usar Peter Chen e apresentar entidades, atributos, relacionamentos e cardinalidades. O modelo lógico deve usar pé de galinha e especificar chaves e vínculos. O dicionário deve registrar tipos, nulabilidade, unicidade e referências.

Veja o [diagrama lógico em pé de galinha](MODELO-LOGICO.md) da versão instalada.

| Conceito | Chaves e regras físicas relevantes |
|---|---|
| Projeto | `projeto.codigo` é a PK inteira. A migração 001 adiciona `codigo_publico VARCHAR(20)`, obrigatório, único e imutável. A API exibe esse código, por exemplo `PRJ-001`, e usa a PK inteira nas relações. |
| Equipe | `participacao` identifica um vínculo pela PK composta `(codigo_projeto, id_participante, data_entrada)`. O mesmo participante pode ter novos períodos de atuação. Data de saída ausente indica vínculo em aberto. |
| Financiamento | A associação `financiamento_projeto` identifica cada apoio por financiamento e projeto. O valor destinado fica no vínculo. Valores são `DECIMAL(15,2)`, e a soma destinada está limitada ao valor total. |
| Produção | `producao_projeto` associa produção e projeto; `autoria` associa produção e participante e guarda a ordem dos autores. A API grava a produção e os vínculos em transação, exigindo ao menos um projeto e um autor. |
| Sessão e auditoria | A migração 002 adiciona `sessao`, com chave baseada no hash do token, vínculo ao usuário e expiração. `log_auditoria` relaciona cada evento ao usuário responsável. |

## Conferência acadêmica

- [ ] Reunir capa e identificação, introdução, escopo, requisitos, casos de uso e modelo de classes.
- [ ] Conferir MER em Peter Chen, modelo lógico em pé de galinha e coerência com as chaves e cardinalidades acima.
- [ ] Incluir implementação física, carga inicial, migrações e exemplos de consultas com resultados reais.
- [ ] Registrar resultados de testes, condições de execução e limitações. Evitar declarar a meta de 3 segundos com 10 mil projetos ou o backup diário sem evidência.
- [ ] Finalizar considerações, exportar o PDF e verificar se diagramas e tabelas continuam legíveis.
- [ ] Separar PDF e SQL com carga inicial para envio. Para reproduzir o ambiente conectado, distribuir também as duas migrações e o guia de execução.

O arquivo local `SIGPesq-final.docx` existente contém capa e seções do **Modelo de Casos de Uso**. Ele serve como fonte para o relatório, que ainda precisa consolidar a modelagem, o SQL, as consultas, os testes e as considerações finais antes da exportação.

Use o [texto-base acadêmico consolidado](RELATORIO-ACADEMICO.md) para integrar essas seções antes de incorporar os diagramas originais e exportar o PDF. Os ensaios de instalação, restauração e desempenho com 10 mil projetos estão na [validação de entrega](validacao-entrega.md).

## Roteiro da banca

1. **Antes da apresentação:** prepare uma base local de demonstração, aplique as migrações e valide as contas dos quatro perfis. Mantenha credenciais fora dos arquivos versionados. Suba os dois serviços usando o [guia do backend](../backend/README.md).
2. **Introdução e modelagem:** apresente o problema, o MER e o diagrama lógico. Explique as relações N:N e a distinção entre PK numérica e código público do projeto.
3. **Fluxo conectado:** como Administrador, cadastre e edite um projeto. Confira a equipe e a auditoria. Pelo Coordenador responsável, inclua e encerre um vínculo e mostre a ordem dos autores de uma produção.
4. **Financiamentos e consultas:** associe um apoio como Administrador e consulte como Gestor. Mostre a agregação de financiamentos por agência e compare a consulta de múltiplos projetos nos recortes vigente e histórico. Antes da apresentação, confirme os fluxos em uma base de ensaio.
5. **Acesso por perfil e fechamento:** confira que Participante consegue consultar sem visualizar CPF e que o Gestor não acessa a auditoria. Encerre com as validações realizadas e as limitações da entrega.

O Case prevê 10–15 minutos de apresentação e participação oral de toda a equipe. Confirme no Classroom a submissão do PDF e do SQL por todos os integrantes.
