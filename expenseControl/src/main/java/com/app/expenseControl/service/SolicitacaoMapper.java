package com.app.expenseControl.service;

import com.app.expenseControl.dto.SolicitacaoHistoricoResponseDTO;
import com.app.expenseControl.dto.SolicitacaoLinhaResponseDTO;
import com.app.expenseControl.dto.SolicitacaoResponseDTO;
import com.app.expenseControl.entity.Solicitacao;
import com.app.expenseControl.entity.SolicitacaoHistorico;
import com.app.expenseControl.entity.SolicitacaoLinha;

import java.util.List;

final class SolicitacaoMapper {

    private SolicitacaoMapper() {
    }

    static SolicitacaoResponseDTO toDTO(Solicitacao solicitacao,
                                        List<SolicitacaoLinha> linhas,
                                        List<SolicitacaoHistorico> historico) {
        return new SolicitacaoResponseDTO(
                solicitacao.getId(),
                solicitacao.getFilial(),
                solicitacao.getCategoria().getId(),
                solicitacao.getCategoria().getNome(),
                solicitacao.getTitulo(),
                solicitacao.getSolicitanteNome(),
                solicitacao.getDescricao(),
                solicitacao.getOndeVaiSerUsado(),
                solicitacao.getValorEstimado(),
                solicitacao.getValorAprovado(),
                solicitacao.getFornecedor(),
                solicitacao.getFormaPagamento(),
                solicitacao.getObservacoes(),
                solicitacao.getStatus(),
                solicitacao.getEnviadoEm(),
                solicitacao.getDecididoEm(),
                solicitacao.getComentarioDecisao(),
                linhas.stream().map(SolicitacaoMapper::toLinhaDTO).toList(),
                historico.stream().map(SolicitacaoMapper::toHistoricoDTO).toList()
        );
    }

    private static SolicitacaoLinhaResponseDTO toLinhaDTO(SolicitacaoLinha linha) {
        return new SolicitacaoLinhaResponseDTO(
                linha.getId(),
                linha.getDescricao(),
                linha.getValor(),
                linha.getObservacao()
        );
    }

    private static SolicitacaoHistoricoResponseDTO toHistoricoDTO(SolicitacaoHistorico historico) {
        return new SolicitacaoHistoricoResponseDTO(
                historico.getId(),
                historico.getAtor(),
                historico.getAcao(),
                historico.getComentario(),
                historico.getCriadoEm()
        );
    }
}
