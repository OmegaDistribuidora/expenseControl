package com.app.expenseControl.repository;

import com.app.expenseControl.entity.SolicitacaoLinha;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SolicitacaoLinhaRepository extends JpaRepository<SolicitacaoLinha, Long> {

    List<SolicitacaoLinha> findBySolicitacaoId(Long solicitacaoId);

    List<SolicitacaoLinha> findBySolicitacaoIdIn(List<Long> solicitacaoIds);

    void deleteBySolicitacaoId(Long solicitacaoId);
}
