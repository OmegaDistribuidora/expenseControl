package com.app.expenseControl.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "auditoria_eventos")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuditoriaEvento {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "usuario", nullable = false, length = 120)
    private String usuario;

    @Column(name = "tipo_conta", nullable = false, length = 30)
    private String tipoConta;

    @Column(name = "acao", nullable = false, length = 80)
    private String acao;

    @Column(name = "referencia_tipo", length = 60)
    private String referenciaTipo;

    @Column(name = "referencia_id", length = 120)
    private String referenciaId;

    @Column(name = "detalhe", nullable = false, length = 2000)
    private String detalhe;

    @Column(name = "criado_em", nullable = false)
    private LocalDateTime criadoEm;

    @PrePersist
    public void prePersist() {
        if (criadoEm == null) {
            criadoEm = LocalDateTime.now();
        }
    }
}

