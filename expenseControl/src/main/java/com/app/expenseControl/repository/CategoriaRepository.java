package com.app.expenseControl.repository;

import com.app.expenseControl.entity.Categoria;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CategoriaRepository extends JpaRepository<Categoria, Long> {
    boolean existsByNomeIgnoreCase(String nome);
    List<Categoria> findAllByOrderByNomeAsc();
    List<Categoria> findByAtivaTrueOrderByNomeAsc();
}
