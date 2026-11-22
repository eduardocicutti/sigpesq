# Frontend SIGPesq

React e JavaScript com Vite. Execute na pasta frontend:

```powershell
npm.cmd install
npm.cmd run dev
```

Verificações: `npm.cmd run build` e `npm.cmd run lint`.

O login é simulado. A tela de acesso mostra o usuário de cada perfil e a senha de demonstração `sigpesq-demo`.

Em Projetos, é possível filtrar por título ou código, situação e coordenação. Os resultados e o número da página podem ser reabertos pela URL. Administração e coordenação podem cadastrar projetos. A edição e a alteração de situação respeitam o perfil e a coordenação do projeto. A aba Equipe reúne vínculos, períodos encerrados e troca administrativa de coordenação. As abas Produções e Financiamentos refletem as associações dos respectivos módulos.

Participantes e Agências têm consulta e manutenção administrativa. O CPF aparece somente para Administrador. Participantes com vínculos não podem ser excluídos, e a tela de agências oferece cadastro e edição. Os serviços simulados ficam em `src/services/`.

O Administrador mantém financiamentos e associações com projetos. O Gestor pode consultá-los. A coordenação mantém produções dos projetos autorizados, incluindo a seleção e a ordem dos autores. A demonstração permite editar e excluir uma produção quando todos os projetos vinculados estão sob a coordenação do docente. Essa regra depende de confirmação para casos de troca de coordenação.

Consultas e relatórios respeitam o perfil. O painel exibe projetos próximos do término e atalhos disponíveis. A Auditoria é de leitura, exclusiva do Administrador, e lista as ações de gravação bem-sucedidas da demonstração.

As alterações da demonstração ficam em memória e são descartadas ao recarregar a página. O contrato da API é um documento interno em `../docs/planejamento/02-CONTRATO-API-INICIAL.md`. Essa pasta fica fora do versionamento. A integração com o MySQL depende da validação do esquema, da sessão e das permissões no servidor.

A revisão visual da aplicação continua pendente.
