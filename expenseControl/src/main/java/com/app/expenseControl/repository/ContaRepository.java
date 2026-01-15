package com.app.expenseControl.repository;

import com.app.expenseControl.entity.Conta;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ContaRepository extends JpaRepository<Conta, Long> {
    Optional<Conta> findByUsuario(String usuario);
    boolean existsByUsuario(String usuario);
}

