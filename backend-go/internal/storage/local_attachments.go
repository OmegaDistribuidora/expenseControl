package storage

import (
	"errors"
	"io"
	"os"
	"path/filepath"
	"strconv"
	"strings"
)

const (
	localFolderPrefix = "local-folder:"
	localFilePrefix   = "local-file:"
)

type LocalAttachments struct {
	root string
}

func NewLocalAttachments(root string) *LocalAttachments {
	return &LocalAttachments{
		root: filepath.Clean(root),
	}
}

func (s *LocalAttachments) EnsureFolder(requestID int64) (string, error) {
	if requestID <= 0 {
		return "", errors.New("id da solicitacao obrigatorio para criar pasta")
	}
	folder := filepath.Join(s.root, strconv.FormatInt(requestID, 10))
	if err := s.ensureWithinRoot(folder); err != nil {
		return "", err
	}
	if err := os.MkdirAll(folder, 0o755); err != nil {
		return "", err
	}
	return localFolderPrefix + strconv.FormatInt(requestID, 10), nil
}

func (s *LocalAttachments) UploadFile(folderID, storedName string, reader io.Reader) (string, error) {
	requestID, err := parseRequestID(folderID)
	if err != nil {
		return "", err
	}
	folder := filepath.Join(s.root, strconv.FormatInt(requestID, 10))
	if err := s.ensureWithinRoot(folder); err != nil {
		return "", err
	}
	if err := os.MkdirAll(folder, 0o755); err != nil {
		return "", err
	}
	target := filepath.Join(folder, storedName)
	if err := s.ensureWithinRoot(target); err != nil {
		return "", err
	}

	file, err := os.Create(target)
	if err != nil {
		return "", err
	}
	defer file.Close()

	if _, err := io.Copy(file, reader); err != nil {
		return "", err
	}
	return localFilePrefix + strconv.FormatInt(requestID, 10) + "/" + storedName, nil
}

func (s *LocalAttachments) OpenFile(fileID string) (*os.File, error) {
	path, err := s.resolveLocalFile(fileID)
	if err != nil {
		return nil, err
	}
	return os.Open(path)
}

func (s *LocalAttachments) DeleteFile(fileID string) error {
	path, err := s.resolveLocalFile(fileID)
	if err != nil {
		return err
	}
	err = os.Remove(path)
	if errors.Is(err, os.ErrNotExist) {
		return nil
	}
	return err
}

func (s *LocalAttachments) resolveLocalFile(fileID string) (string, error) {
	if !strings.HasPrefix(fileID, localFilePrefix) {
		return "", errors.New("id de arquivo invalido para armazenamento local")
	}
	relative := strings.TrimPrefix(fileID, localFilePrefix)
	relative = filepath.Clean(relative)
	fullPath := filepath.Join(s.root, relative)
	if err := s.ensureWithinRoot(fullPath); err != nil {
		return "", err
	}
	return fullPath, nil
}

func (s *LocalAttachments) ensureWithinRoot(path string) error {
	rootAbs, err := filepath.Abs(s.root)
	if err != nil {
		return err
	}
	pathAbs, err := filepath.Abs(path)
	if err != nil {
		return err
	}
	normalizedRoot := strings.TrimRight(rootAbs, string(os.PathSeparator)) + string(os.PathSeparator)
	normalizedPath := strings.TrimRight(pathAbs, string(os.PathSeparator)) + string(os.PathSeparator)
	if !strings.HasPrefix(strings.ToLower(normalizedPath), strings.ToLower(normalizedRoot)) &&
		!strings.EqualFold(strings.TrimRight(pathAbs, string(os.PathSeparator)), strings.TrimRight(rootAbs, string(os.PathSeparator))) {
		return errors.New("caminho de anexo local invalido")
	}
	return nil
}

func parseRequestID(folderID string) (int64, error) {
	if !strings.HasPrefix(folderID, localFolderPrefix) {
		return 0, errors.New("id de pasta invalido para armazenamento local")
	}
	trimmed := strings.TrimSpace(strings.TrimPrefix(folderID, localFolderPrefix))
	if trimmed == "" {
		return 0, errors.New("id de pasta local vazio")
	}
	id, err := strconv.ParseInt(trimmed, 10, 64)
	if err != nil {
		return 0, err
	}
	return id, nil
}
