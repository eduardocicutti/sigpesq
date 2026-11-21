<div align="center">

<img src="assets/icons/database.svg" width="64" alt="">

# SIGPesq

Sistema de Gerenciamento de Projetos de Pesquisa Universitários

Trabalho da disciplina de **Banco de Dados**, da análise de requisitos à modelagem e implementação de um banco relacional integrado a uma aplicação web.

[Sobre](#sobre) · [Escopo](#escopo) · [Tecnologias](#tecnologias) · [Banco de dados](#banco-de-dados) · [Organização](#organizacao)

</div>

---

<a id="sobre"></a>

## <img src="assets/icons/info-circle.svg" width="22" alt=""> Sobre o projeto

O SIGPesq propõe centralizar informações de pesquisas universitárias que hoje ficam distribuídas em planilhas. O sistema reúne projetos, participantes, financiamentos e produções científicas, permitindo acompanhar prazos, vínculos e resultados com integridade e rastreabilidade.

O desenvolvimento parte do estudo de caso da disciplina e conecta os requisitos do sistema aos modelos conceitual, lógico e físico do banco de dados.

<a id="escopo"></a>

## <img src="assets/icons/target-arrow.svg" width="22" alt=""> Escopo

| Área | O que o sistema deve gerenciar |
| :-- | :-- |
| **Projetos** | Identificação, descrição, período, situação e docente coordenador. |
| **Participantes** | Docentes, discentes e técnicos, com suas funções e períodos de participação em cada projeto. |
| **Financiamentos** | Agências, tipos de fomento, valores, vigências e projetos apoiados. |
| **Produções científicas** | Artigos, capítulos, softwares e relatórios, com autores e vínculo ao projeto. |

As consultas devem permitir acompanhar projetos por coordenador, participantes e produções de cada projeto, além dos financiamentos por agência.

<a id="tecnologias"></a>

## <img src="assets/icons/code.svg" width="22" alt=""> Tecnologias

| Tecnologia | Papel no projeto | Por que usar |
| :-- | :-- | :-- |
| **React** | Interface web | Reutilizar componentes de formulários, tabelas e navegação. |
| **JavaScript** | Linguagem do frontend e do backend | Manter uma linguagem comum nas duas partes da aplicação. |
| **Node.js + Express** | API | Organizar rotas, validar dados e conectar a interface ao banco. |
| **MySQL** | Banco de dados relacional | Implementar o modelo exigido no case, com relacionamentos, restrições de integridade e consultas SQL. |

```text
Interface React → API Node.js + Express → Banco MySQL
```

O acesso ao banco fica concentrado na API. As telas consomem seus serviços, mantendo a apresentação separada das regras e da persistência dos dados.

<a id="banco-de-dados"></a>

## <img src="assets/icons/schema.svg" width="22" alt=""> Banco de dados

O trabalho contempla:

- Levantamento de requisitos, regras de negócio, casos de uso e modelo de classes.
- Modelagem conceitual em **Peter Chen**, com entidades, atributos e cardinalidades.
- Modelagem lógica em **Crow's Foot**, com tabelas, chaves e relacionamentos.
- Implementação física no **MySQL**, com scripts de criação e carga inicial.
- Consultas SQL sobre coordenadores, participação em múltiplos projetos, produções por ano e financiamento por agência.

Os relacionamentos devem representar participantes em vários projetos, financiamentos compartilhados e produções com múltiplos autores, preservando a consistência dos registros.

<a id="organizacao"></a>

## <img src="assets/icons/folder.svg" width="22" alt=""> Organização e andamento

| Material | Local |
| :-- | :-- |
| Enunciado do trabalho | [Case_SIGPesq.pdf](docs/fontes/Case_SIGPesq.pdf) |
| Referências visuais | [referencias/](referencias/) |

**Etapa atual:** planejamento do frontend. A implementação da interface, da API e a integração com o MySQL fazem parte das próximas etapas.

---

Ícones de [Tabler Icons](https://tabler.io/icons), sob [licença MIT](assets/icons/LICENSE).
