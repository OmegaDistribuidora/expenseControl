package store

import (
	"context"
	"errors"
	"time"

	"github.com/OmegaDistribuidora/expenseControl/backend-go/internal/domain"
	"github.com/jackc/pgx/v5"
)

func (s *PostgresStore) CountAttachmentsBySolicitacao(ctx context.Context, solicitacaoID int64) (int64, error) {
	var total int64
	err := s.Pool.QueryRow(ctx, "SELECT COUNT(1) FROM anexos WHERE solicitacao_id = $1", solicitacaoID).Scan(&total)
	return total, err
}

func (s *PostgresStore) FindAttachmentByID(ctx context.Context, attachmentID int64) (*domain.Attachment, error) {
	var item domain.Attachment
	err := s.Pool.QueryRow(ctx, `
		SELECT id, solicitacao_id, drive_file_id, drive_folder_id, original_name, stored_name, content_type, size, uploaded_by, created_at
		FROM anexos
		WHERE id = $1
		LIMIT 1
	`, attachmentID).Scan(
		&item.ID,
		&item.SolicitacaoID,
		&item.DriveFileID,
		&item.DriveFolderID,
		&item.OriginalName,
		&item.StoredName,
		&item.ContentType,
		&item.Size,
		&item.UploadedBy,
		&item.CreatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &item, nil
}

func (s *PostgresStore) CreateAttachment(ctx context.Context, attachment domain.Attachment) (*domain.Attachment, error) {
	var out domain.Attachment
	err := s.Pool.QueryRow(ctx, `
		INSERT INTO anexos (
			solicitacao_id, drive_file_id, drive_folder_id, original_name, stored_name, content_type, size, uploaded_by, created_at
		) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
		RETURNING id, solicitacao_id, drive_file_id, drive_folder_id, original_name, stored_name, content_type, size, uploaded_by, created_at
	`,
		attachment.SolicitacaoID,
		attachment.DriveFileID,
		attachment.DriveFolderID,
		attachment.OriginalName,
		attachment.StoredName,
		attachment.ContentType,
		attachment.Size,
		attachment.UploadedBy,
		time.Now().UTC(),
	).Scan(
		&out.ID,
		&out.SolicitacaoID,
		&out.DriveFileID,
		&out.DriveFolderID,
		&out.OriginalName,
		&out.StoredName,
		&out.ContentType,
		&out.Size,
		&out.UploadedBy,
		&out.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &out, nil
}

func (s *PostgresStore) DeleteAttachmentByID(ctx context.Context, attachmentID int64) error {
	cmd, err := s.Pool.Exec(ctx, `DELETE FROM anexos WHERE id = $1`, attachmentID)
	if err != nil {
		return err
	}
	if cmd.RowsAffected() == 0 {
		return ErrAnexoNaoEncontrado
	}
	return nil
}

var ErrAnexoNaoEncontrado = errors.New("anexo_nao_encontrado")
