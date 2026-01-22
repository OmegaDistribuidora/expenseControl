package com.app.expenseControl.repository;

import com.app.expenseControl.entity.Solicitacao;
import com.app.expenseControl.dto.SolicitacaoBreakdownDTO;
import com.app.expenseControl.dto.SolicitacaoStatusResumoDTO;
import com.app.expenseControl.enums.StatusSolicitacao;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.List;

public interface SolicitacaoRepository extends JpaRepository<Solicitacao, Long> {
    List<Solicitacao> findByFilialOrderByEnviadoEmDesc(String filial);
    List<Solicitacao> findByStatusOrderByEnviadoEmDesc(StatusSolicitacao status);
    Page<Solicitacao> findByFilialOrderByEnviadoEmDesc(String filial, Pageable pageable);
    Page<Solicitacao> findByStatusOrderByEnviadoEmDesc(StatusSolicitacao status, Pageable pageable);
    long countByStatus(StatusSolicitacao status);

    @Query("select sum(coalesce(s.valorAprovado, s.valorEstimado)) from Solicitacao s where s.status = :status")
    BigDecimal sumValorAprovadoByStatus(@Param("status") StatusSolicitacao status);

    @Query("""
            select new com.app.expenseControl.dto.SolicitacaoBreakdownDTO(
                c.nome,
                count(s),
                sum(coalesce(s.valorAprovado, s.valorEstimado))
            )
            from Solicitacao s
            join s.categoria c
            where s.status = :status
            group by c.nome
            order by sum(coalesce(s.valorAprovado, s.valorEstimado)) desc
            """)
    List<SolicitacaoBreakdownDTO> resumoPorCategoria(@Param("status") StatusSolicitacao status);

    @Query("""
            select new com.app.expenseControl.dto.SolicitacaoBreakdownDTO(
                s.filial,
                count(s),
                sum(coalesce(s.valorAprovado, s.valorEstimado))
            )
            from Solicitacao s
            where s.status = :status
            group by s.filial
            order by sum(coalesce(s.valorAprovado, s.valorEstimado)) desc
            """)
    List<SolicitacaoBreakdownDTO> resumoPorFilial(@Param("status") StatusSolicitacao status);

    @Query("""
            select new com.app.expenseControl.dto.SolicitacaoStatusResumoDTO(
                s.status,
                count(s)
            )
            from Solicitacao s
            group by s.status
            """)
    List<SolicitacaoStatusResumoDTO> resumoPorStatus();

    @Query("""
            select s from Solicitacao s
            where s.filial = :filial
              and (
                (:id is not null and s.id = :id)
                or (:statusSearch is not null and s.status = :statusSearch)
                or lower(s.titulo) like :term
                or lower(s.descricao) like :term
                or lower(s.fornecedor) like :term
                or lower(s.solicitanteNome) like :term
                or lower(s.categoria.nome) like :term
              )
            """)
    Page<Solicitacao> searchByFilial(
            @Param("filial") String filial,
            @Param("term") String term,
            @Param("id") Long id,
            @Param("statusSearch") StatusSolicitacao statusSearch,
            Pageable pageable
    );

    @Query("""
            select s from Solicitacao s
            where (
                (:id is not null and s.id = :id)
                or (:statusSearch is not null and s.status = :statusSearch)
                or lower(s.titulo) like :term
                or lower(s.filial) like :term
                or lower(s.descricao) like :term
                or lower(s.fornecedor) like :term
                or lower(s.solicitanteNome) like :term
                or lower(s.categoria.nome) like :term
            )
            """)
    Page<Solicitacao> searchAll(
            @Param("term") String term,
            @Param("id") Long id,
            @Param("statusSearch") StatusSolicitacao statusSearch,
            Pageable pageable
    );

    @Query("""
            select s from Solicitacao s
            where s.status = :status
              and (
                (:id is not null and s.id = :id)
                or (:statusSearch is not null and s.status = :statusSearch)
                or lower(s.titulo) like :term
                or lower(s.filial) like :term
                or lower(s.descricao) like :term
                or lower(s.fornecedor) like :term
                or lower(s.solicitanteNome) like :term
                or lower(s.categoria.nome) like :term
              )
            """)
    Page<Solicitacao> searchByStatus(
            @Param("status") StatusSolicitacao status,
            @Param("term") String term,
            @Param("id") Long id,
            @Param("statusSearch") StatusSolicitacao statusSearch,
            Pageable pageable
    );
}
