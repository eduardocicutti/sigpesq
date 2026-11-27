-- Aplicar uma vez, depois da carga original, antes de abrir o banco para escrita.
-- O cliente deve selecionar a base SIGPesq ao abrir a conexão.
ALTER TABLE projeto ADD COLUMN codigo_publico VARCHAR(20) NULL;
UPDATE projeto SET codigo_publico = CONCAT('PRJ-', LPAD(codigo, GREATEST(3, CHAR_LENGTH(codigo)), '0'));
ALTER TABLE projeto MODIFY codigo_publico VARCHAR(20) NOT NULL,
  ADD CONSTRAINT uq_projeto_codigo_publico UNIQUE (codigo_publico);

DELIMITER $$
CREATE TRIGGER trg_projeto_codigo_publico_bu BEFORE UPDATE ON projeto
FOR EACH ROW
BEGIN
  IF BINARY NEW.codigo_publico <> BINARY OLD.codigo_publico THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'O código público do projeto é imutável.';
  END IF;
END$$

CREATE TRIGGER trg_participante_usuario_docente_bu BEFORE UPDATE ON participante
FOR EACH ROW
BEGIN
  IF NEW.tipo <> 'DOCENTE' AND EXISTS (
    SELECT 1 FROM usuario WHERE id_participante = OLD.id_participante AND perfil = 'COORDENADOR'
  ) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Participante com conta de coordenador deve permanecer docente.';
  END IF;
END$$

-- A transação e o registro da auditoria pertencem ao serviço chamador.
DROP PROCEDURE sp_cadastrar_projeto$$
CREATE PROCEDURE sp_cadastrar_projeto(
  IN p_codigo_publico VARCHAR(20), IN p_titulo VARCHAR(200), IN p_descricao TEXT,
  IN p_inicio DATE, IN p_termino DATE, IN p_situacao VARCHAR(15),
  IN p_id_coordenador INT UNSIGNED, OUT p_id_projeto INT UNSIGNED)
BEGIN
  INSERT INTO projeto (codigo_publico,titulo,descricao,data_inicio,data_termino,situacao,id_coordenador)
    VALUES (p_codigo_publico,p_titulo,p_descricao,p_inicio,p_termino,p_situacao,p_id_coordenador);
  SET p_id_projeto = LAST_INSERT_ID();
  INSERT INTO participacao (codigo_projeto,id_participante,data_entrada,funcao)
    VALUES (p_id_projeto,p_id_coordenador,p_inicio,'COORDENADOR');
END$$
DELIMITER ;
