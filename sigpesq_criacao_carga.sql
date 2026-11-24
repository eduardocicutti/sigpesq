-- SIGPesq - Sistema de Gerenciamento de Projetos de Pesquisa Universitários
-- Script de criação do banco e carga de dados de exemplo


DROP DATABASE IF EXISTS sigpesq;
CREATE DATABASE sigpesq
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;
USE sigpesq;


-- 1. TABELAS

-- participante ---------------------------------------------------------
CREATE TABLE participante (
  id_participante     INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nome                VARCHAR(150) NOT NULL,
  email_institucional VARCHAR(120) NOT NULL,
  cpf                 CHAR(11)     NOT NULL,
  tipo                VARCHAR(10)  NOT NULL,
  CONSTRAINT pk_participante PRIMARY KEY (id_participante),
  CONSTRAINT uq_participante_email UNIQUE (email_institucional),
  CONSTRAINT uq_participante_cpf   UNIQUE (cpf),
  CONSTRAINT ck_participante_email
    CHECK (REGEXP_LIKE(email_institucional, '^[^@ ]+@[^@ ]+\\.[^@ ]+$')),
  CONSTRAINT ck_participante_cpf
    CHECK (REGEXP_LIKE(cpf, '^[0-9]{11}$')),
  CONSTRAINT ck_participante_tipo
    CHECK (tipo IN ('DOCENTE','DISCENTE','TECNICO'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- projeto --------------------------------------------------------------
CREATE TABLE projeto (
  codigo          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  titulo          VARCHAR(200) NOT NULL,
  descricao       TEXT         NOT NULL,
  data_inicio     DATE         NOT NULL,
  data_termino    DATE         NOT NULL,
  situacao        VARCHAR(15)  NOT NULL DEFAULT 'EM_ANDAMENTO',
  id_coordenador  INT UNSIGNED NOT NULL,
  CONSTRAINT pk_projeto PRIMARY KEY (codigo),
  CONSTRAINT ck_projeto_datas    CHECK (data_termino >= data_inicio),
  CONSTRAINT ck_projeto_situacao
    CHECK (situacao IN ('EM_ANDAMENTO','CONCLUIDO','CANCELADO')),
  KEY idx_projeto_coordenador (id_coordenador),
  KEY idx_projeto_situacao (situacao, data_termino),
  CONSTRAINT fk_projeto_coordenador FOREIGN KEY (id_coordenador)
    REFERENCES participante (id_participante)
    ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- participacao (identificação: projeto + participante + data de entrada)
CREATE TABLE participacao (
  codigo_projeto  INT UNSIGNED  NOT NULL,
  id_participante INT UNSIGNED NOT NULL,
  data_entrada    DATE         NOT NULL,
  funcao          VARCHAR(20)  NOT NULL,
  data_saida      DATE         NULL,
  CONSTRAINT pk_participacao PRIMARY KEY (codigo_projeto, id_participante, data_entrada),
  CONSTRAINT ck_participacao_datas
    CHECK (data_saida IS NULL OR data_saida >= data_entrada),
  CONSTRAINT ck_participacao_funcao
    CHECK (funcao IN ('COORDENADOR','VICE_COORDENADOR','PESQUISADOR',
                      'BOLSISTA','COLABORADOR','VOLUNTARIO','OUTRO')),
  KEY idx_participacao_participante (id_participante),
  CONSTRAINT fk_participacao_projeto FOREIGN KEY (codigo_projeto)
    REFERENCES projeto (codigo)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_participacao_participante FOREIGN KEY (id_participante)
    REFERENCES participante (id_participante)
    ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- agencia_financiadora -------------------------------------------------
CREATE TABLE agencia_financiadora (
  id_agencia INT UNSIGNED NOT NULL AUTO_INCREMENT,
  sigla      VARCHAR(15)  NOT NULL,
  nome       VARCHAR(150) NOT NULL,
  CONSTRAINT pk_agencia PRIMARY KEY (id_agencia),
  CONSTRAINT uq_agencia_sigla UNIQUE (sigla)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- financiamento --------------------------------------------------------
CREATE TABLE financiamento (
  id_financiamento     INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  id_agencia           INT UNSIGNED  NOT NULL,
  tipo_fomento         VARCHAR(10)   NOT NULL,
  valor_total          DECIMAL(15,2) NOT NULL,
  data_inicio_vigencia DATE          NOT NULL,
  data_fim_vigencia    DATE          NOT NULL,
  CONSTRAINT pk_financiamento PRIMARY KEY (id_financiamento),
  CONSTRAINT ck_financiamento_valor CHECK (valor_total > 0),
  CONSTRAINT ck_financiamento_tipo
    CHECK (tipo_fomento IN ('BOLSA','AUXILIO','CONVENIO','OUTRO')),
  CONSTRAINT ck_financiamento_vigencia
    CHECK (data_fim_vigencia >= data_inicio_vigencia),
  KEY idx_financiamento_agencia (id_agencia),
  CONSTRAINT fk_financiamento_agencia FOREIGN KEY (id_agencia)
    REFERENCES agencia_financiadora (id_agencia)
    ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- financiamento_projeto (classe associativa ApoioFinanceiro) -----------
CREATE TABLE financiamento_projeto (
  id_financiamento INT UNSIGNED  NOT NULL,
  codigo_projeto   INT UNSIGNED   NOT NULL,
  valor_destinado  DECIMAL(15,2) NOT NULL,
  CONSTRAINT pk_financiamento_projeto PRIMARY KEY (id_financiamento, codigo_projeto),
  CONSTRAINT ck_finproj_valor CHECK (valor_destinado > 0),
  KEY idx_finproj_projeto (codigo_projeto),
  CONSTRAINT fk_finproj_financiamento FOREIGN KEY (id_financiamento)
    REFERENCES financiamento (id_financiamento)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_finproj_projeto FOREIGN KEY (codigo_projeto)
    REFERENCES projeto (codigo)
    ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- producao_cientifica --------------------------------------------------
CREATE TABLE producao_cientifica (
  id_producao    INT UNSIGNED      NOT NULL AUTO_INCREMENT,
  titulo         VARCHAR(250)      NOT NULL,
  tipo           VARCHAR(20)       NOT NULL,
  ano_publicacao SMALLINT UNSIGNED NOT NULL,
  meio_divulgacao VARCHAR(200)     NOT NULL,
  CONSTRAINT pk_producao PRIMARY KEY (id_producao),
  CONSTRAINT ck_producao_tipo
    CHECK (tipo IN ('ARTIGO','CAPITULO_LIVRO','LIVRO','SOFTWARE',
                    'RELATORIO_TECNICO','OUTRO')),
  KEY idx_producao_ano_tipo (ano_publicacao, tipo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- producao_projeto (associação gera N:N) -------------------------------
CREATE TABLE producao_projeto (
  id_producao    INT UNSIGNED NOT NULL,
  codigo_projeto INT UNSIGNED  NOT NULL,
  CONSTRAINT pk_producao_projeto PRIMARY KEY (id_producao, codigo_projeto),
  KEY idx_producao_projeto_projeto (codigo_projeto),
  CONSTRAINT fk_prodproj_producao FOREIGN KEY (id_producao)
    REFERENCES producao_cientifica (id_producao)
    ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT fk_prodproj_projeto FOREIGN KEY (codigo_projeto)
    REFERENCES projeto (codigo)
    ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- autoria (classe associativa) -----------------------------------------
CREATE TABLE autoria (
  id_producao     INT UNSIGNED     NOT NULL,
  id_participante INT UNSIGNED     NOT NULL,
  ordem_autoria   TINYINT UNSIGNED NOT NULL,
  CONSTRAINT pk_autoria PRIMARY KEY (id_producao, id_participante),
  CONSTRAINT uq_autoria_ordem UNIQUE (id_producao, ordem_autoria),
  CONSTRAINT ck_autoria_ordem CHECK (ordem_autoria >= 1),
  KEY idx_autoria_participante (id_participante),
  CONSTRAINT fk_autoria_producao FOREIGN KEY (id_producao)
    REFERENCES producao_cientifica (id_producao)
    ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT fk_autoria_participante FOREIGN KEY (id_participante)
    REFERENCES participante (id_participante)
    ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- usuario (senha_hash guarda apenas o hash; o algoritmo é definido pela aplicação)
CREATE TABLE usuario (
  id_usuario      INT UNSIGNED NOT NULL AUTO_INCREMENT,
  login           VARCHAR(40)  NOT NULL,
  senha_hash      VARCHAR(255) NOT NULL,
  perfil          VARCHAR(15)  NOT NULL,
  ativo           TINYINT(1)   NOT NULL DEFAULT 1,
  id_participante INT UNSIGNED NULL,
  CONSTRAINT pk_usuario PRIMARY KEY (id_usuario),
  CONSTRAINT uq_usuario_login UNIQUE (login),
  CONSTRAINT uq_usuario_participante UNIQUE (id_participante),
  CONSTRAINT ck_usuario_perfil
    CHECK (perfil IN ('ADMINISTRADOR','COORDENADOR','PARTICIPANTE','GESTOR')),
  CONSTRAINT ck_usuario_ativo CHECK (ativo IN (0,1)),
  CONSTRAINT fk_usuario_participante FOREIGN KEY (id_participante)
    REFERENCES participante (id_participante)
    ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- log_auditoria (preenchida pela aplicação ou por gatilhos, na mesma transação)
CREATE TABLE log_auditoria (
  id_log         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  data_hora      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  id_usuario     INT UNSIGNED    NOT NULL,
  tabela         VARCHAR(50)     NOT NULL,
  operacao       VARCHAR(6)      NOT NULL,
  chave_registro VARCHAR(100)    NOT NULL,
  descricao      VARCHAR(255)    NOT NULL,
  CONSTRAINT pk_log_auditoria PRIMARY KEY (id_log),
  CONSTRAINT ck_log_operacao CHECK (operacao IN ('INSERT','UPDATE','DELETE')),
  KEY idx_log_usuario (id_usuario),
  KEY idx_log_data (data_hora),
  KEY idx_log_tabela_chave (tabela, chave_registro),
  CONSTRAINT fk_log_usuario FOREIGN KEY (id_usuario)
    REFERENCES usuario (id_usuario)
    ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- 2. GATILHOS (regras que CHECK/FK não conseguem expressar)

DELIMITER $$

-- RN02: coordenador do projeto deve ser DOCENTE; código imutável -------
CREATE TRIGGER trg_projeto_coordenador_bi
BEFORE INSERT ON projeto FOR EACH ROW
BEGIN
  IF (SELECT tipo FROM participante
       WHERE id_participante = NEW.id_coordenador) <> 'DOCENTE' THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'RN02: o coordenador do projeto deve ser um participante do tipo Docente.';
  END IF;
END$$

CREATE TRIGGER trg_projeto_coordenador_bu
BEFORE UPDATE ON projeto FOR EACH ROW
BEGIN
  IF NEW.codigo <> OLD.codigo THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'RN01: o código do projeto não pode ser alterado.';
  END IF;
  IF (SELECT tipo FROM participante
       WHERE id_participante = NEW.id_coordenador) <> 'DOCENTE' THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'RN02: o coordenador do projeto deve ser um participante do tipo Docente.';
  END IF;
END$$

-- RN02: docente que coordena projeto não pode mudar de tipo ------------
CREATE TRIGGER trg_participante_tipo_bu
BEFORE UPDATE ON participante FOR EACH ROW
BEGIN
  IF NEW.tipo <> 'DOCENTE'
     AND EXISTS (SELECT 1 FROM projeto WHERE id_coordenador = OLD.id_participante) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'RN02: participante que coordena projetos deve permanecer do tipo Docente.';
  END IF;
END$$

-- RN13: soma dos valores destinados <= valor total ---------------------
CREATE TRIGGER trg_finproj_valor_bi
BEFORE INSERT ON financiamento_projeto FOR EACH ROW
BEGIN
  DECLARE v_total DECIMAL(15,2);
  DECLARE v_soma  DECIMAL(15,2);
  SELECT valor_total INTO v_total
    FROM financiamento WHERE id_financiamento = NEW.id_financiamento;
  SELECT COALESCE(SUM(valor_destinado), 0) INTO v_soma
    FROM financiamento_projeto WHERE id_financiamento = NEW.id_financiamento;
  IF v_soma + NEW.valor_destinado > v_total THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'RN13: a soma dos valores destinados ultrapassa o valor total do financiamento.';
  END IF;
END$$

CREATE TRIGGER trg_finproj_valor_bu
BEFORE UPDATE ON financiamento_projeto FOR EACH ROW
BEGIN
  DECLARE v_total DECIMAL(15,2);
  DECLARE v_soma  DECIMAL(15,2);
  SELECT valor_total INTO v_total
    FROM financiamento WHERE id_financiamento = NEW.id_financiamento;
  SELECT COALESCE(SUM(valor_destinado), 0) INTO v_soma
    FROM financiamento_projeto
   WHERE id_financiamento = NEW.id_financiamento
     AND NOT (id_financiamento = OLD.id_financiamento
              AND codigo_projeto = OLD.codigo_projeto);
  IF v_soma + NEW.valor_destinado > v_total THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'RN13: a soma dos valores destinados ultrapassa o valor total do financiamento.';
  END IF;
END$$

CREATE TRIGGER trg_financiamento_valor_bu
BEFORE UPDATE ON financiamento FOR EACH ROW
BEGIN
  DECLARE v_soma DECIMAL(15,2);
  SELECT COALESCE(SUM(valor_destinado), 0) INTO v_soma
    FROM financiamento_projeto WHERE id_financiamento = OLD.id_financiamento;
  IF NEW.valor_total < v_soma THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'RN13: o valor total não pode ficar menor que a soma já destinada aos projetos.';
  END IF;
END$$

-- RNF04: perfis Coordenador/Participante exigem participante; -----------
--        Coordenador exige participante do tipo DOCENTE
CREATE TRIGGER trg_usuario_perfil_bi
BEFORE INSERT ON usuario FOR EACH ROW
BEGIN
  IF NEW.perfil IN ('COORDENADOR','PARTICIPANTE') AND NEW.id_participante IS NULL THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Usuários Coordenador e Participante devem estar ligados a um participante.';
  END IF;
  IF NEW.perfil = 'COORDENADOR'
     AND (SELECT tipo FROM participante
           WHERE id_participante = NEW.id_participante) <> 'DOCENTE' THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Usuário Coordenador deve estar ligado a um participante do tipo Docente.';
  END IF;
END$$

CREATE TRIGGER trg_usuario_perfil_bu
BEFORE UPDATE ON usuario FOR EACH ROW
BEGIN
  IF NEW.perfil IN ('COORDENADOR','PARTICIPANTE') AND NEW.id_participante IS NULL THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Usuários Coordenador e Participante devem estar ligados a um participante.';
  END IF;
  IF NEW.perfil = 'COORDENADOR'
     AND (SELECT tipo FROM participante
           WHERE id_participante = NEW.id_participante) <> 'DOCENTE' THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Usuário Coordenador deve estar ligado a um participante do tipo Docente.';
  END IF;
END$$

-- RNF09: trilha de auditoria não pode ser alterada nem apagada ---------
CREATE TRIGGER trg_log_auditoria_bu
BEFORE UPDATE ON log_auditoria FOR EACH ROW
BEGIN
  SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'RNF09: registros de auditoria não podem ser alterados.';
END$$

CREATE TRIGGER trg_log_auditoria_bd
BEFORE DELETE ON log_auditoria FOR EACH ROW
BEGIN
  SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'RNF09: registros de auditoria não podem ser excluídos.';
END$$

DELIMITER ;

-- =====================================================================
-- 2B. PROCEDIMENTOS (operações compostas, atômicas e independentes de interface)
--     Opcionais: a aplicação pode chamá-los ou implementar a mesma lógica.
-- =====================================================================
DELIMITER $$

-- Cadastra o projeto (código gerado automaticamente, devolvido em p_codigo) e registra o coordenador na equipe (função COORDENADOR)
CREATE PROCEDURE sp_cadastrar_projeto(
  IN p_titulo VARCHAR(200), IN p_descricao TEXT,
  IN p_data_inicio DATE, IN p_data_termino DATE, IN p_situacao VARCHAR(15),
  IN p_id_coordenador INT UNSIGNED, OUT p_codigo INT UNSIGNED)
BEGIN
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;
  START TRANSACTION;
    INSERT INTO projeto (titulo, descricao, data_inicio, data_termino,
                         situacao, id_coordenador)
    VALUES (p_titulo, p_descricao, p_data_inicio, p_data_termino,
            p_situacao, p_id_coordenador);
    SET p_codigo = LAST_INSERT_ID();
    INSERT INTO participacao (codigo_projeto, id_participante, data_entrada, funcao, data_saida)
    VALUES (p_codigo, p_id_coordenador, p_data_inicio, 'COORDENADOR', NULL);
  COMMIT;
END$$

-- Troca o coordenador: encerra o vínculo anterior e cria o novo (mantém histórico)
CREATE PROCEDURE sp_trocar_coordenador(
  IN p_codigo INT UNSIGNED, IN p_novo_coordenador INT UNSIGNED, IN p_data DATE)
BEGIN
  DECLARE v_atual INT UNSIGNED;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;
  SELECT id_coordenador INTO v_atual FROM projeto WHERE codigo = p_codigo;
  IF v_atual IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Projeto não encontrado.';
  END IF;
  IF v_atual = p_novo_coordenador THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'O docente já coordena o projeto.';
  END IF;
  START TRANSACTION;
    UPDATE projeto SET id_coordenador = p_novo_coordenador WHERE codigo = p_codigo;
    UPDATE participacao SET data_saida = p_data
     WHERE codigo_projeto = p_codigo AND funcao = 'COORDENADOR' AND data_saida IS NULL;
    INSERT INTO participacao (codigo_projeto, id_participante, data_entrada, funcao, data_saida)
    VALUES (p_codigo, p_novo_coordenador, p_data, 'COORDENADOR', NULL);
  COMMIT;
END$$

DELIMITER ;


-- 3. CARGA DE DADOS DE EXEMPLO
--    (CPFs e e-mails fictícios, apenas para teste)


-- participantes ---------------------------------------------------------
INSERT INTO participante (id_participante, nome, email_institucional, cpf, tipo) VALUES
( 1, 'Ana Paula Ferreira Lima',   'ana.lima@ufes.edu.br',               '15881399803', 'DOCENTE'),
( 2, 'Beatriz Carvalho Duarte',   'beatriz.duarte@aluno.ufes.edu.br',   '81967273138', 'DISCENTE'),
( 3, 'Camila Ventura Reis',       'camila.reis@aluno.ufes.edu.br',      '75136270101', 'DISCENTE'),
( 4, 'Carlos Eduardo Monteiro',   'carlos.monteiro@ufes.edu.br',        '69879730917', 'DOCENTE'),
( 5, 'Elaine Cristina Batista',   'elaine.batista@ufes.edu.br',         '84162294810', 'TECNICO'),
( 6, 'Fernanda Rocha Alves',      'fernanda.alves@ufes.edu.br',         '11417075350', 'DOCENTE'),
( 7, 'Gabriel Antunes Ribeiro',   'gabriel.ribeiro@aluno.ufes.edu.br',  '77848648842', 'DISCENTE'),
( 8, 'Juliana Martins Prado',     'juliana.prado@ufes.edu.br',          '88447294072', 'DOCENTE'),
( 9, 'Larissa Fontes Moreira',    'larissa.moreira@aluno.ufes.edu.br',  '87680457190', 'DISCENTE'),
(10, 'Lucas Henrique Barbosa',    'lucas.barbosa@aluno.ufes.edu.br',    '97880932054', 'DISCENTE'),
(11, 'Marcos Vinicius Teixeira',  'marcos.teixeira@ufes.edu.br',        '55761698757', 'DOCENTE'),
(12, 'Mariana Lopes Cardoso',     'mariana.cardoso@aluno.ufes.edu.br',  '76634400210', 'DISCENTE'),
(13, 'Patricia Gomes Nogueira',   'patricia.nogueira@ufes.edu.br',      '16897684600', 'DOCENTE'),
(14, 'Pedro Henrique Siqueira',   'pedro.siqueira@aluno.ufes.edu.br',   '07981933102', 'DISCENTE'),
(15, 'Rafael Almeida Coutinho',   'rafael.coutinho@aluno.ufes.edu.br',  '28459173064', 'DISCENTE'),
(16, 'Ricardo Souza Bastos',      'ricardo.bastos@ufes.edu.br',         '33917280562', 'DOCENTE'),
(17, 'Roberto Luiz Pinheiro',     'roberto.pinheiro@ufes.edu.br',       '40682915370', 'TECNICO'),
(18, 'Sandra Regina Oliveira',    'sandra.oliveira@ufes.edu.br',        '52173948601', 'TECNICO'),
(19, 'Thiago Pereira Vasconcelos','thiago.vasconcelos@aluno.ufes.edu.br','61890245713', 'DISCENTE');

-- projetos --------------------------------------------------------------
INSERT INTO projeto (codigo, titulo, descricao, data_inicio, data_termino, situacao, id_coordenador) VALUES
(1, 'Monitoramento da qualidade da água do Rio São Mateus com sensores IoT',
 'Rede de sensores de baixo custo para acompanhar parâmetros de qualidade da água do rio.',
 '2023-03-01', '2025-02-28', 'CONCLUIDO', 1),
(2, 'Aprendizado de máquina para previsão de safras de café conilon',
 'Modelos preditivos de produtividade a partir de dados climáticos e de manejo.',
 '2023-08-01', '2026-07-31', 'CONCLUIDO', 4),
(3, 'Plataforma de dados abertos para gestão pública municipal',
 'Portal de publicação e consumo de dados abertos para prefeituras do norte capixaba.',
 '2024-02-01', '2026-12-31', 'EM_ANDAMENTO', 6),
(4, 'Otimização de rotas para coleta seletiva de resíduos',
 'Algoritmos de roteirização de veículos aplicados à coleta seletiva municipal.',
 '2024-05-01', '2027-04-30', 'EM_ANDAMENTO', 1),
(5, 'Bioprospecção de microrganismos do manguezal',
 'Isolamento e caracterização de microrganismos com potencial biotecnológico.',
 '2024-03-01', '2025-08-31', 'CANCELADO', 16),
(6, 'Diagnóstico de doenças em plantas por visão computacional',
 'Classificação de doenças foliares com redes neurais convolucionais.',
 '2025-03-01', '2027-02-28', 'EM_ANDAMENTO', 4),
(7, 'Robótica educacional nas escolas do norte capixaba',
 'Kits de robótica de baixo custo e formação de professores da rede pública.',
 '2025-04-01', '2026-11-30', 'EM_ANDAMENTO', 8),
(8, 'Eficiência energética em edificações públicas',
 'Diagnóstico e propostas de redução de consumo de energia em prédios públicos.',
 '2025-08-01', '2027-07-31', 'EM_ANDAMENTO', 11),
(9, 'Análise de redes de colaboração científica da UFES',
 'Mapeamento de redes de coautoria e colaboração entre grupos de pesquisa.',
 '2026-02-01', '2028-01-31', 'EM_ANDAMENTO', 6),
(10, 'Gestão de dados de pesquisa e ciência aberta',
 'Boas práticas e infraestrutura para gestão e compartilhamento de dados de pesquisa.',
 '2026-03-01', '2027-12-31', 'EM_ANDAMENTO', 1);

-- participação (equipes) -------------------------------------------------
INSERT INTO participacao (codigo_projeto, id_participante, data_entrada, funcao, data_saida) VALUES
-- Projeto 1
(1,  1, '2023-03-01', 'COORDENADOR',  '2025-02-28'),
(1, 13, '2023-03-01', 'PESQUISADOR',  '2025-02-28'),
(1,  2, '2023-03-01', 'BOLSISTA',     '2025-02-28'),
(1, 10, '2023-06-01', 'VOLUNTARIO',   '2025-02-28'),
(1, 18, '2023-03-01', 'COLABORADOR',  '2025-02-28'),
-- Projeto 2
(2,  4, '2023-08-01', 'COORDENADOR',  '2026-07-31'),
(2,  7, '2023-08-01', 'BOLSISTA',     '2026-07-31'),
(2, 11, '2023-08-01', 'PESQUISADOR',  '2026-07-31'),
(2, 12, '2023-08-01', 'BOLSISTA',     '2026-07-31'),
-- Projeto 3
(3,  6, '2024-02-01', 'COORDENADOR',  NULL),
(3, 13, '2024-02-01', 'PESQUISADOR',  NULL),
(3,  5, '2024-02-01', 'COLABORADOR',  NULL),
(3, 10, '2024-03-01', 'BOLSISTA',     NULL),
(3, 19, '2024-02-01', 'VOLUNTARIO',   NULL),
-- Projeto 4 (Rafael retorna ao projeto com nova data de entrada)
(4,  1, '2024-05-01', 'COORDENADOR',  NULL),
(4,  9, '2024-05-01', 'BOLSISTA',     NULL),
(4, 18, '2024-05-01', 'COLABORADOR',  NULL),
(4, 15, '2024-05-01', 'VOLUNTARIO',   '2025-04-30'),
(4, 15, '2025-08-01', 'BOLSISTA',     NULL),
-- Projeto 5 (cancelado)
(5, 16, '2024-03-01', 'COORDENADOR',  '2025-06-30'),
(5,  3, '2024-03-01', 'BOLSISTA',     '2025-06-30'),
-- Projeto 6
(6,  4, '2025-03-01', 'COORDENADOR',  NULL),
(6,  6, '2025-03-01', 'PESQUISADOR',  NULL),
(6,  7, '2025-03-01', 'BOLSISTA',     NULL),
(6, 14, '2025-03-01', 'BOLSISTA',     NULL),
(6, 17, '2025-03-01', 'COLABORADOR',  NULL),
-- Projeto 7
(7,  8, '2025-04-01', 'COORDENADOR',  NULL),
(7,  3, '2025-09-01', 'BOLSISTA',     NULL),
(7,  5, '2025-04-01', 'COLABORADOR',  NULL),
(7, 12, '2025-04-01', 'VOLUNTARIO',   NULL),
-- Projeto 8
(8, 11, '2025-08-01', 'COORDENADOR',  NULL),
(8, 16, '2025-09-01', 'PESQUISADOR',  NULL),
(8, 17, '2025-08-01', 'COLABORADOR',  NULL),
(8, 19, '2025-08-01', 'BOLSISTA',     NULL),
-- Projeto 9
(9,  6, '2026-02-01', 'COORDENADOR',  NULL),
(9,  2, '2026-02-01', 'BOLSISTA',     NULL),
(9, 14, '2026-02-01', 'BOLSISTA',     NULL),
-- Projeto 10
(10,  1, '2026-03-01', 'COORDENADOR',  NULL),
(10, 13, '2026-03-01', 'PESQUISADOR',  NULL),
(10,  9, '2026-03-01', 'BOLSISTA',     NULL);

-- agências ---------------------------------------------------------------
INSERT INTO agencia_financiadora (id_agencia, sigla, nome) VALUES
(1, 'CNPq',       'Conselho Nacional de Desenvolvimento Científico e Tecnológico'),
(2, 'FAPES',      'Fundação de Amparo à Pesquisa e Inovação do Espírito Santo'),
(3, 'CAPES',      'Coordenação de Aperfeiçoamento de Pessoal de Nível Superior'),
(4, 'PRPPG/UFES', 'Pró-Reitoria de Pesquisa e Pós-Graduação da UFES'),
(5, 'FINEP',      'Financiadora de Estudos e Projetos');

-- financiamentos (total geral: R$ 926.000,00) ---------------------------
INSERT INTO financiamento (id_financiamento, id_agencia, tipo_fomento, valor_total, data_inicio_vigencia, data_fim_vigencia) VALUES
(1, 1, 'AUXILIO',  200000.00, '2024-01-01', '2027-12-31'),
(2, 2, 'BOLSA',     96000.00, '2023-08-01', '2026-07-31'),
(3, 3, 'BOLSA',     72000.00, '2024-05-01', '2026-12-31'),
(4, 2, 'AUXILIO',  150000.00, '2024-05-01', '2027-04-30'),
(5, 1, 'BOLSA',    120000.00, '2025-08-01', '2027-07-31'),
(6, 3, 'BOLSA',     40000.00, '2025-04-01', '2026-11-30'),
(7, 1, 'CONVENIO', 170000.00, '2025-03-01', '2028-02-29'),
(8, 2, 'CONVENIO',  48000.00, '2023-03-01', '2025-02-28'),
(9, 4, 'AUXILIO',   30000.00, '2026-03-01', '2027-12-31');

-- apoio financeiro (respeita RN13) ----------------------------------------
INSERT INTO financiamento_projeto (id_financiamento, codigo_projeto, valor_destinado) VALUES
(1, 3, 120000.00),
(1, 9,  60000.00),
(2, 2,  48000.00),
(2, 6,  36000.00),
(3, 4,  32000.00),
(4, 4, 150000.00),
(5, 8,  80000.00),
(6, 7,  40000.00),
(7, 6, 100000.00),
(8, 1,  48000.00),
(9, 10,  30000.00);

-- produções científicas ---------------------------------------------------
INSERT INTO producao_cientifica (id_producao, titulo, tipo, ano_publicacao, meio_divulgacao) VALUES
( 1, 'Roteirização de veículos aplicada à gestão de resíduos sólidos', 'CAPITULO_LIVRO', 2026,
     'Livro Pesquisa Operacional em Cidades Inteligentes - Editora UFES'),
( 2, 'Algoritmo genético para roteamento da coleta seletiva', 'ARTIGO', 2025,
     'Simpósio Brasileiro de Pesquisa Operacional (SBPO)'),
( 3, 'Sensores IoT para monitoramento da qualidade da água em rios capixabas', 'ARTIGO', 2024,
     'Revista Brasileira de Recursos Hídricos'),
( 4, 'Rede de sensores de baixo custo para qualidade da água: relatório final', 'RELATORIO_TECNICO', 2025,
     'Relatório Técnico - Departamento de Computação e Eletrônica/UFES'),
( 5, 'Previsão de safras de café conilon com redes neurais', 'ARTIGO', 2024,
     'Congresso Brasileiro de Agroinformática'),
( 6, 'Ferramenta de previsão de produtividade de café conilon', 'SOFTWARE', 2025,
     'Repositório institucional da UFES'),
( 7, 'Portal de dados abertos municipais', 'SOFTWARE', 2025,
     'Repositório de código da UFES'),
( 8, 'Governança de dados abertos em municípios capixabas', 'ARTIGO', 2025,
     'Revista de Administração Pública'),
( 9, 'Perfil microbiano de áreas de manguezal do litoral norte', 'ARTIGO', 2025,
     'Revista Brasileira de Biotecnologia'),
(10, 'Classificação de doenças em folhas de cafeeiro com CNNs', 'ARTIGO', 2026,
     'Conference on Graphics, Patterns and Images (SIBGRAPI)'),
(11, 'Visão computacional aplicada à agricultura: relatório técnico', 'RELATORIO_TECNICO', 2026,
     'Relatório Técnico - Departamento de Computação e Eletrônica/UFES'),
(12, 'Kits de robótica de baixo custo para o ensino fundamental', 'ARTIGO', 2025,
     'Workshop de Robótica Educacional'),
(13, 'Diagnóstico energético de edificações públicas capixabas', 'RELATORIO_TECNICO', 2026,
     'Relatório Técnico - Departamento de Computação e Eletrônica/UFES'),
(14, 'Redes de colaboração científica da UFES: uma análise de coautoria', 'ARTIGO', 2026,
     'Simpósio Brasileiro de Banco de Dados (SBBD)');

INSERT INTO producao_projeto (id_producao, codigo_projeto) VALUES
( 1, 4), ( 2, 4),
( 3, 1), ( 4, 1),
( 5, 2), ( 6, 2),
( 7, 3), ( 8, 3),
( 9, 5),
(10, 6), (11, 6),
(12, 7),
(13, 8),
(14, 9);

INSERT INTO autoria (id_producao, id_participante, ordem_autoria) VALUES
( 1,  1, 1), ( 1,  9, 2),
( 2,  9, 1), ( 2, 15, 2), ( 2,  1, 3),
( 3,  1, 1), ( 3,  2, 2), ( 3, 10, 3),
( 4,  1, 1), ( 4, 13, 2), ( 4, 18, 3),
( 5,  4, 1), ( 5,  7, 2), ( 5, 11, 3),
( 6,  4, 1), ( 6, 12, 2),
( 7,  6, 1), ( 7, 19, 2), ( 7,  5, 3),
( 8,  6, 1), ( 8, 13, 2), ( 8, 10, 3),
( 9, 16, 1), ( 9,  3, 2),
(10,  4, 1), (10, 14, 2), (10,  7, 3),
(11,  6, 1), (11, 17, 2),
(12,  8, 1), (12,  3, 2), (12, 12, 3),
(13, 11, 1), (13, 19, 2), (13, 16, 3),
(14,  6, 1), (14,  2, 2), (14, 14, 3);

-- Usuários e trilha de auditoria NÃO recebem carga: dependem da tecnologia
-- de autenticação a ser escolhida (algoritmo de hash, login, etc.).
-- Modelo para criar o primeiro usuário quando isso estiver definido:
-- INSERT INTO usuario (login, senha_hash, perfil, ativo, id_participante)
-- VALUES ('admin', '<hash gerado pela aplicação>', 'ADMINISTRADOR', 1, NULL);

-- =====================================================================
-- 4. CONSULTAS DE APOIO (RF13 a RF20 e C19) - execute à parte
-- =====================================================================
/*
-- RF13: projetos coordenados por um docente
SELECT p.codigo, p.titulo, p.data_inicio, p.data_termino, p.situacao
  FROM projeto p JOIN participante d ON d.id_participante = p.id_coordenador
 WHERE d.nome = 'Ana Paula Ferreira Lima';

-- RF14: participantes de um projeto, com função e período
SELECT pa.nome, pa.tipo, pc.funcao, pc.data_entrada,
       COALESCE(DATE_FORMAT(pc.data_saida,'%d/%m/%Y'),'em aberto') AS saida
  FROM participacao pc JOIN participante pa USING (id_participante)
 WHERE pc.codigo_projeto = 4;

-- RF15: produções de um projeto
SELECT pr.titulo, pr.tipo, pr.ano_publicacao, pr.meio_divulgacao
  FROM producao_projeto pp JOIN producao_cientifica pr USING (id_producao)
 WHERE pp.codigo_projeto = 4;

-- RF16: financiamentos de uma agência
SELECT f.id_financiamento, f.tipo_fomento, f.valor_total,
       f.data_inicio_vigencia, f.data_fim_vigencia
  FROM financiamento f JOIN agencia_financiadora a USING (id_agencia)
 WHERE a.sigla = 'FAPES';

-- RF17: projetos e coordenadores
SELECT p.codigo, p.titulo, c.nome AS coordenador
  FROM projeto p JOIN participante c ON c.id_participante = p.id_coordenador;

-- RF18: produções de um ano e tipo
SELECT titulo, tipo, ano_publicacao FROM producao_cientifica
 WHERE ano_publicacao = 2025 AND tipo = 'ARTIGO';

-- RF19: total de financiamento por agência
SELECT a.sigla, COUNT(f.id_financiamento) AS qtd, COALESCE(SUM(f.valor_total),0) AS valor_total
  FROM agencia_financiadora a LEFT JOIN financiamento f USING (id_agencia)
 GROUP BY a.id_agencia, a.sigla ORDER BY valor_total DESC;

-- RF20: participantes em mais de um projeto
SELECT pa.nome, pa.tipo, COUNT(DISTINCT pc.codigo_projeto) AS qtd_projetos
  FROM participante pa JOIN participacao pc USING (id_participante)
 GROUP BY pa.id_participante, pa.nome, pa.tipo
HAVING qtd_projetos > 1;

-- C19: produções que violam RN16/RN17 (sem autor ou sem projeto)
SELECT pr.id_producao, pr.titulo
  FROM producao_cientifica pr
 WHERE NOT EXISTS (SELECT 1 FROM autoria a WHERE a.id_producao = pr.id_producao)
    OR NOT EXISTS (SELECT 1 FROM producao_projeto pp WHERE pp.id_producao = pr.id_producao);
*/
