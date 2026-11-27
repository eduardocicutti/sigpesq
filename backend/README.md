# API do SIGPesq

Esta etapa integra sessão, docentes, listagem, detalhe e cadastro de projetos. Use Node.js 22.12 ou superior e MySQL 8.4. O React inicia em modo demonstração por padrão.

## Preparar uma base de desenvolvimento

O script acadêmico começa com `DROP DATABASE IF EXISTS sigpesq`. Importe-o apenas em uma instância descartável. Se já houver uma base com dados de trabalho, faça backup e teste as migrações primeiro em uma cópia.

Abra o cliente MySQL a partir da raiz do repositório, com uma conta autorizada a criar o esquema, triggers e procedures. Em uma instância nova, execute:

```sql
SOURCE sigpesq_criacao_carga.sql
USE sigpesq;
SOURCE backend/migrations/001_projetos.sql
SOURCE backend/migrations/002_sessao.sql
```

As migrações são aplicadas uma vez. A primeira preenche os códigos públicos como `PRJ-001` e preserva as chaves e os vínculos numéricos. A segunda cria as sessões com expiração. A chave de participação continua sendo projeto, participante e data de entrada.

Configure uma conta MySQL de desenvolvimento para a aplicação. Para esta etapa, ela precisa de leitura em participante, projeto, participacao e usuario, leitura e escrita em sessao, execução da procedure sp_cadastrar_projeto e inserção em log_auditoria. O comando de criação do primeiro administrador requer também inserção em usuario. A procedure é criada com os privilégios do definidor.

## Executar no PowerShell

Na raiz do repositório:

```powershell
cd backend
npm.cmd ci
Copy-Item .env.example .env
```

Edite `.env` com os dados de conexão e a origem do frontend. Execute o primeiro comando abaixo uma vez por base. Ele solicita a senha sem incluí-la no histórico do terminal.

```powershell
npm.cmd run admin -- admin
npm.cmd start
```

Em outro terminal, a partir da raiz do repositório:

```powershell
cd frontend
npm.cmd ci --include=dev
$env:VITE_MODO = "api"
npm.cmd run dev -- --port 5173 --strictPort
```

Abra `http://localhost:5173`. No Linux, use `npm`, copie o exemplo com `cp .env.example .env` e inicie o frontend com `VITE_MODO=api npm run dev -- --port 5173 --strictPort`. O Vite encaminha `/api` à porta 3001. Para voltar à demonstração, encerre o Vite, remova a variável e reinicie.

## Verificação

### Contas para testar os quatro perfis

Em um banco local de demonstração já migrado, informe uma senha temporária pela variável `DEMO_PASSWORD` e execute `node --env-file=.env demo-usuarios.js` na pasta `backend`. O comando usa os participantes de exemplo disponíveis para vincular as contas de Coordenador e Participante. Os hashes são gravados no MySQL. Mantenha a senha fora do Git.

Com o usuário criado, cadastre um projeto e anote o código público. Recarregue a página e localize o projeto pelo código. No detalhe, confira o docente na equipe. A operação também gera um registro INSERT em log_auditoria na mesma transação. Execute `npm test` em backend para os testes automatizados.
