# Frontend SIGPesq

React e JavaScript com Vite. Execute na pasta frontend:

```powershell
npm.cmd install
npm.cmd run dev
```

Verificações: `npm.cmd run build` e `npm.cmd run lint`.

A demonstração permite selecionar perfil, consultar painel, buscar projetos e abrir seus detalhes. Não representa autenticação real.

Os dados sintéticos ficam em `src/services/projetos.js`. A listagem assíncrona retorna `dados` e `paginacao`, com datas ISO e situações do domínio. A tela formata esses valores para apresentação e trata carregamento, falha com nova tentativa e busca vazia. O resumo é independente da paginação da lista.

Não há gravação, API ou conexão MySQL. O contrato completo está em `../docs/planejamento/02-CONTRATO-API-INICIAL.md`; o serviço atual cobre somente leitura inicial de projetos e resumo demonstrativo. A integração ainda depende da validação do esquema, sessão e permissões no servidor.

Próxima etapa: formulário de projeto, criação e edição com validações e permissões conforme UC02/UC03/UC04. A revisão visual da aplicação continua pendente.
