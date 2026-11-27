# Modelo lógico do SIGPesq

Diagrama em pé de galinha das 12 tabelas após a carga e as migrações 001 e 002. As relações mostram a cardinalidade garantida pelas chaves estrangeiras. Veja as regras adicionais abaixo e os tipos no [dicionário resumido](RELATORIO-ACADEMICO.md#5-modelagem-lógica-e-dicionário-resumido).

```mermaid
erDiagram
    PARTICIPANTE ||--o{ PROJETO : coordena
    PARTICIPANTE ||--o{ PARTICIPACAO : integra
    PROJETO ||--o{ PARTICIPACAO : possui
    AGENCIA_FINANCIADORA ||--o{ FINANCIAMENTO : concede
    FINANCIAMENTO ||--o{ FINANCIAMENTO_PROJETO : destina
    PROJETO ||--o{ FINANCIAMENTO_PROJETO : recebe
    PRODUCAO_CIENTIFICA ||--o{ PRODUCAO_PROJETO : relaciona
    PROJETO ||--o{ PRODUCAO_PROJETO : gera
    PRODUCAO_CIENTIFICA ||--o{ AUTORIA : possui
    PARTICIPANTE ||--o{ AUTORIA : assina
    PARTICIPANTE o|--o| USUARIO : vincula
    USUARIO ||--o{ SESSAO : autentica
    USUARIO ||--o{ LOG_AUDITORIA : origina

    PARTICIPANTE {
        int id_participante PK
        varchar nome
        varchar email_institucional UK
        char cpf UK
        varchar tipo
    }
    PROJETO {
        int codigo PK
        varchar codigo_publico UK
        varchar titulo
        text descricao
        date data_inicio
        date data_termino
        varchar situacao
        int id_coordenador FK
    }
    PARTICIPACAO {
        int codigo_projeto PK, FK
        int id_participante PK, FK
        date data_entrada PK
        varchar funcao
        date data_saida
    }
    AGENCIA_FINANCIADORA {
        int id_agencia PK
        varchar sigla UK
        varchar nome
    }
    FINANCIAMENTO {
        int id_financiamento PK
        int id_agencia FK
        varchar tipo_fomento
        decimal valor_total
        date data_inicio_vigencia
        date data_fim_vigencia
    }
    FINANCIAMENTO_PROJETO {
        int id_financiamento PK, FK
        int codigo_projeto PK, FK
        decimal valor_destinado
    }
    PRODUCAO_CIENTIFICA {
        int id_producao PK
        varchar titulo
        varchar tipo
        smallint ano_publicacao
        varchar meio_divulgacao
    }
    PRODUCAO_PROJETO {
        int id_producao PK, FK
        int codigo_projeto PK, FK
    }
    AUTORIA {
        int id_producao PK, FK
        int id_participante PK, FK
        tinyint ordem_autoria
    }
    USUARIO {
        int id_usuario PK
        varchar login UK
        varchar senha_hash
        varchar perfil
        tinyint ativo
        int id_participante FK, UK
    }
    SESSAO {
        binary token_hash PK
        int id_usuario FK
        datetime expira_em
    }
    LOG_AUDITORIA {
        bigint id_log PK
        datetime data_hora
        int id_usuario FK
        varchar tabela
        varchar operacao
        varchar chave_registro
        varchar descricao
    }
```

- `PROJETO.id_coordenador` referencia obrigatoriamente um participante do tipo docente. O cadastro de projeto cria o vínculo de coordenação; a troca preserva o período anterior.
- A associação de `USUARIO` com `PARTICIPANTE` é opcional na estrutura física. Os gatilhos e a sessão exigem o vínculo conforme o perfil.
- As FKs permitem que uma produção exista fisicamente com zero vínculos dependentes. A API exige no mínimo um autor e um projeto e grava as associações em transação. A ordem é única por produção.
- Cada associação de financiamento registra valor destinado. A soma das destinações está limitada ao valor total.
- O MER conceitual acadêmico permanece na entrega original do modelo de dados. Este diagrama descreve a versão relacional efetivamente instalada.
