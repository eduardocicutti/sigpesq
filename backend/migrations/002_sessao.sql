CREATE TABLE IF NOT EXISTS sessao (
  token_hash BINARY(32) NOT NULL PRIMARY KEY,
  id_usuario INT UNSIGNED NOT NULL,
  expira_em DATETIME NOT NULL,
  INDEX idx_sessao_expira (expira_em),
  CONSTRAINT fk_sessao_usuario FOREIGN KEY (id_usuario)
    REFERENCES usuario(id_usuario) ON DELETE CASCADE
) ENGINE=InnoDB;
