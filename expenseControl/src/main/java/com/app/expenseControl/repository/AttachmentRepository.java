package com.app.expenseControl.repository;

import com.app.expenseControl.entity.Attachment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AttachmentRepository extends JpaRepository<Attachment, Long> {

    List<Attachment> findBySolicitacaoIdOrderByCreatedAtAsc(Long solicitacaoId);

    long countBySolicitacaoId(Long solicitacaoId);
}
