package com.app.expenseControl.entity;

import com.app.expenseControl.enums.StatusSolicitacao;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "solicitacoes")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Solicitacao {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 120)
    private String filial;

    @ManyToOne(optional = false)
    @JoinColumn(name = "categoria_id")
    private Categoria categoria;

    @Column(nullable = false, length = 120)
    private String titulo;

    @Column(nullable = false, length = 2000)
    private String descricao;

    @Column(nullable = false, length = 255)
    private String ondeVaiSerUsado;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal valorEstimado;

    @Column(precision = 12, scale = 2)
    private BigDecimal valorAprovado;

    @Column(length = 120)
    private String fornecedor;

    @Column(length = 50)
    private String formaPagamento;

    @Column(length = 1000)
    private String observacoes;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private StatusSolicitacao status;

    @Column(name = "criado_em", nullable = false)
    private LocalDateTime criadoEm;

    @Column(nullable = false)
    private LocalDateTime enviadoEm;

    private LocalDateTime decididoEm;

    @Column(length = 500)
    private String comentarioDecisao;

    @PrePersist
    public void prePersist() {
        if (this.criadoEm == null) this.criadoEm = LocalDateTime.now();
        if (this.enviadoEm == null) this.enviadoEm = LocalDateTime.now();
        if (this.status == null) this.status = StatusSolicitacao.PENDENTE;
    }
}
