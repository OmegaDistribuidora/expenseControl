package com.app.expenseControl.repository;

import com.app.expenseControl.entity.Conta;
import com.app.expenseControl.enums.TipoConta;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ContaRepository extends JpaRepository<Conta, Long> {
    Optional<Conta> findByUsuario(String usuario);
    boolean existsByUsuario(String usuario);
    List<Conta> findByTipoOrderByFilialAscUsuarioAsc(TipoConta tipo);
}

