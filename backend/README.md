# API do SIGPesq

A API em Express integra a interface ao MySQL 8.4. Use Node.js 22.12 ou superior. O React inicia no modo conectado por padrão.

## Preparar uma base de desenvolvimento

Na raiz do repositório, execute no PowerShell com uma conta autorizada. Use o cliente em modo batch e pare se algum comando falhar. Se a base já existe, pule a carga e verifique quais migrações faltam em uma cópia antes de aplicá-las.

```powershell
$mysql = "C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe"
& $mysql --default-character-set=utf8mb4 -u root -p -e "source sigpesq_criacao_carga.sql"
if ($LASTEXITCODE -ne 0) { throw "A carga falhou. Confira o estado da base." }
& $mysql --default-character-set=utf8mb4 -u root -p sigpesq -e "source backend/migrations/001_projetos.sql"
if ($LASTEXITCODE -ne 0) { throw "A migração 001 falhou." }
& $mysql --default-character-set=utf8mb4 -u root -p sigpesq -e "source backend/migrations/002_sessao.sql"
if ($LASTEXITCODE -ne 0) { throw "A migração 002 falhou." }
```

As migrações são aplicadas uma vez. A primeira preenche os códigos públicos como `PRJ-001` e preserva as chaves e os vínculos numéricos. A segunda cria as sessões com expiração. A chave de participação continua sendo projeto, participante e data de entrada.

Configure uma conta MySQL de aplicação para a base local. Limite os privilégios a `SELECT` no esquema, `EXECUTE` em `sp_cadastrar_projeto`, escrita de sessão e gravações necessárias nas tabelas de negócio. O comando de criação do primeiro administrador requer também inserção em `usuario`. Reserve as operações de DDL e migração à conta responsável pela instalação.

## Executar no PowerShell

Na raiz do repositório:

```powershell
cd backend
npm.cmd ci
if (!(Test-Path .env)) { Copy-Item .env.example .env }
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
npm.cmd run dev -- --port 5173 --strictPort
```

Abra `http://localhost:5173`. No Linux, use `npm`, copie o exemplo com `cp .env.example .env` e inicie com `npm run dev -- --port 5173 --strictPort`. O Vite encaminha `/api` ao Express em `127.0.0.1:3001`. Para abrir a demonstração, use `npm run dev:demo`.

## Verificação

### Contas para testar os quatro perfis

Em um banco local de demonstração já migrado, informe uma senha temporária pela variável `DEMO_PASSWORD` e execute `node --env-file=.env demo-usuarios.js` na pasta `backend`. O comando usa os participantes de exemplo disponíveis para vincular as contas de Coordenador e Participante. Os hashes são gravados no MySQL. Mantenha a senha fora do Git.

Com o usuário criado, cadastre um projeto e anote o código público. Recarregue a página e localize o projeto pelo código. No detalhe, confira o docente na equipe. A operação também gera um registro INSERT em log_auditoria na mesma transação. Execute `npm test` em backend para os testes automatizados. Consulte a [matriz de entrega](../docs/ENTREGA.md) para os outros módulos, permissões e limitações da verificação.
