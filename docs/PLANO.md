# Plano de execução — SIGPesq

## 0. Preparação e organização
Status: estrutura documental criada; conteúdo das entregas ainda não revisado nesta etapa.

- Manter as entregas originais na pasta SIGPesq.
- Centralizar instruções em Interface/AGENTS.md, planejamento em docs/ e imagens em referencias/.
- Registrar fontes e skills. Receber as duas imagens de referência.
- Reservar a futura organização de código em frontend/ e backend/; criar esses projetos apenas na implementação.

Saída: instruções gerais, inventário de fontes e roteiro de trabalho.

## 1. Planejamento funcional, visual e de integração
Status: pendente; as duas imagens foram recebidas e salvas em referencias/.

1. Ler case, requisitos, casos de uso, classes, modelo de dados e interface já entregue.
2. Cruzar documentos e registrar divergências sem redefinir o que já foi aprovado.
3. Produzir matriz: requisito e fonte → ator → fluxo → tela → campos/regras → operação da API.
4. Desenhar mapa de navegação e especificar cada tela, ações e estados.
5. Analisar as duas imagens; definir qual contribuição de cada uma será utilizada.
6. Produzir wireframes e proposta visual com componentes reutilizáveis e responsividade.
7. Definir contrato inicial da API: rotas, métodos, exemplos JSON, validações, erros e paginação quando aplicável.
8. Conferir cobertura dos requisitos e consolidar a direção visual antes da implementação.

Saída: mapa de telas, especificações, referências anotadas, direção visual e contrato inicial. Nenhuma tela específica é considerada confirmada antes da leitura das fontes.

## 2. Frontend funcional com dados simulados
Status: futura.

- Implementar React/JavaScript seguindo o planejamento consolidado.
- Começar por um fluxo representativo completo e reutilizar seus componentes nos demais.
- Implementar navegação, formulários, validações e estados previstos.
- Manter dados simulados atrás de serviços com o mesmo contrato da API futura.
- Inspecionar visualmente as telas e testar fluxos críticos; informar limites da persistência simulada.

Saída: interface navegável e verificável, preparada para consumir a API.

## 3. API e integração com o banco
Status: futura; depende do esquema do grupo para a integração definitiva.

- Implementar Node.js/Express conforme o contrato iniciado na etapa 1.
- Conferir com o grupo esquema, tipos, chaves, relacionamentos, restrições e scripts de criação.
- Implementar regras, validações, tratamento de erros e acesso ao banco em módulos próprios.
- Integrar um fluxo completo primeiro; depois expandir para os demais.
- Substituir serviços simulados pelos reais e verificar persistência, falhas e integridade.

Saída: fluxos funcionando da interface até o banco. O contrato pode evoluir, mas mudanças devem ser refletidas nos dois lados.

## 4. Validação e finalização
Status: futura.

- Validar requisitos ponta a ponta, acessibilidade básica e comportamento responsivo.
- Revisar permissões e segurança conforme o escopo documentado.
- Documentar instalação, execução, configuração e preparação do banco sem expor segredos.
- Preparar dados de demonstração, roteiro de apresentação e lista explícita de limitações.

Saída: aplicação testada, documentação e pacote de entrega reproduzível.

## Regra para avançar
Cada etapa depende de saídas verificáveis da anterior. A API é planejada junto com as telas, embora sua implementação fique na etapa 3. O foco imediato é concluir a etapa 1, sem antecipar implementação.
