package com.app.expenseControl.repository;

import com.app.expenseControl.entity.AuditoriaEvento;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AuditoriaEventoRepository extends JpaRepository<AuditoriaEvento, Long> {

    @Query("""
            select a
            from AuditoriaEvento a
            where lower(coalesce(a.usuario, '')) like :term
               or lower(coalesce(a.tipoConta, '')) like :term
               or lower(coalesce(a.acao, '')) like :term
               or lower(coalesce(a.detalhe, '')) like :term
               or lower(coalesce(a.detalheCompleto, '')) like :term
               or lower(coalesce(a.referenciaTipo, '')) like :term
               or lower(coalesce(a.referenciaId, '')) like :term
            """)
    Page<AuditoriaEvento> search(@Param("term") String term, Pageable pageable);
}
