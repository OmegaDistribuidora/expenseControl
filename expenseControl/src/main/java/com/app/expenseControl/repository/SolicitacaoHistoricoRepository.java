package com.app.expenseControl.repository;

import com.app.expenseControl.entity.SolicitacaoHistorico;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SolicitacaoHistoricoRepository extends JpaRepository<SolicitacaoHistorico, Long> {

    List<SolicitacaoHistorico> findBySolicitacaoIdOrderByCriadoEmAsc(Long solicitacaoId);

    List<SolicitacaoHistorico> findBySolicitacaoIdInOrderByCriadoEmAsc(List<Long> solicitacaoIds);

    void deleteBySolicitacaoId(Long solicitacaoId);
}

