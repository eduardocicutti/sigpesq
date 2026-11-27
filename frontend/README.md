# Frontend SIGPesq

Interface em React e JavaScript. O Vite deste projeto requer Node.js 20.19 ou posterior da série 20, ou Node.js 22.12 ou superior.

No Linux Mint, a partir da raiz do repositório clonado:

```bash
cd frontend
npm ci --include=dev
npm run dev
```

Abra o endereço indicado em `Local` e mantenha o terminal aberto. Se aparecer `vite: not found`, confira a versão com `node --version` e a saída do comando de instalação.

No Windows PowerShell, dentro de `frontend`:

```powershell
npm.cmd ci --include=dev
npm.cmd run dev
```

Verificações: `npm.cmd run build` e `npm.cmd run lint`.

### Modos de execução

O comando `npm run dev` abre o modo conectado. Use `npm run dev:demo` para a demonstração, que mostra o usuário de cada perfil e a senha `sigpesq-demo`. As descrições dos módulos abaixo referem-se à demonstração.

Para usar o MySQL, prepare e inicie a API no diretório `backend/`. O navegador acessa `/api/v1` na própria origem. No desenvolvimento o Vite encaminha essas chamadas para `127.0.0.1:3001`. Use a mesma origem configurada em `FRONTEND_ORIGIN` no backend. Em hospedagem, configure um proxy para esse caminho.

O modo integrado oferece sessão, painel, projetos e equipes, cadastros, financiamentos, produções, consultas e auditoria. A identidade e o perfil vêm da sessão do servidor. Consulte a [matriz de entrega](../docs/ENTREGA.md) para os fluxos e os papéis de cada perfil.

O teste de navegador integrado requer Firefox e uma API em execução com banco **descartável**. Configure `FRONTEND_ORIGIN=http://127.0.0.1:5191` na API e `VITE_MODO=api`, `TESTE_API_LOGIN` e `TESTE_API_SENHA` no ambiente do teste. Use uma conta administrativa da base de testes. Execute `node teste-navegador.mjs` na pasta frontend. O roteiro usa o painel, cria e edita um projeto, confere a equipe, recarrega a página e encerra a sessão.

Em Projetos, é possível filtrar por título ou código, situação e coordenação. Os resultados e o número da página podem ser reabertos pela URL. Administração e coordenação podem cadastrar projetos. A edição e a alteração de situação respeitam o perfil e a coordenação do projeto. A aba Equipe reúne vínculos, períodos encerrados e troca administrativa de coordenação. As abas Produções e Financiamentos refletem as associações dos respectivos módulos.

Participantes e Agências têm consulta e manutenção administrativa. O CPF aparece somente para Administrador. Participantes com vínculos não podem ser excluídos, e a tela de agências oferece cadastro e edição. Os serviços simulados ficam em `src/services/`.

O Administrador mantém financiamentos e associações com projetos. O Gestor pode consultá-los. A coordenação mantém produções dos projetos autorizados, incluindo a seleção e a ordem dos autores. A demonstração permite editar e excluir uma produção quando todos os projetos vinculados estão sob a coordenação do docente. Essa regra depende de confirmação para casos de troca de coordenação.

Consultas e relatórios respeitam o perfil. O painel exibe projetos próximos do término e atalhos disponíveis. A Auditoria é de leitura, exclusiva do Administrador, e lista as ações de gravação bem-sucedidas da demonstração.

As alterações da demonstração ficam em memória e são descartadas ao recarregar a página. O contrato da API é um documento interno em `../docs/planejamento/02-CONTRATO-API-INICIAL.md`. Essa pasta fica fora do versionamento. A integração com o MySQL depende da validação do esquema, da sessão e das permissões no servidor.

Para testar os serviços, execute `node --test`. Com Firefox instalado, execute `node teste-navegador.mjs` na pasta frontend para verificar login, navegação por perfil, largura das páginas, controle da senha pelo teclado, cadastro de projeto e acesso à auditoria. O teste usa dados em memória e as larguras de 360, 768 e 1440 px.
