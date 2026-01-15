package com.app.expenseControl.repository;

import com.app.expenseControl.entity.Solicitacao;
import com.app.expenseControl.enums.StatusSolicitacao;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SolicitacaoRepository extends JpaRepository<Solicitacao, Long> {
    List<Solicitacao> findByFilialOrderByEnviadoEmDesc(String filial);
    List<Solicitacao> findByStatusOrderByEnviadoEmDesc(StatusSolicitacao status);
}
