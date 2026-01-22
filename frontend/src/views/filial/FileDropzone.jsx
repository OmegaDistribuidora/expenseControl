import { useState } from "react";

export const FileDropzone = ({
  accept,
  disabled,
  multiple,
  helpText,
  summaryText,
  onFiles,
  inputId,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const dropzoneClass = ["file-dropzone", isDragging ? "is-dragging" : "", disabled ? "is-disabled" : ""]
    .filter(Boolean)
    .join(" ");

  const handleFiles = (fileList) => {
    const files = Array.from(fileList || []);
    if (files.length === 0) return;
    onFiles(files);
  };

  return (
    <div
      className={dropzoneClass}
      role="group"
      aria-disabled={disabled}
      onDragOver={(event) => {
        event.preventDefault();
        if (disabled) return;
        setIsDragging(true);
      }}
      onDragLeave={(event) => {
        event.preventDefault();
        setIsDragging(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        if (disabled) return;
        setIsDragging(false);
        handleFiles(event.dataTransfer.files);
      }}
    >
      <input
        id={inputId}
        className="file-input"
        type="file"
        multiple={multiple}
        accept={accept}
        disabled={disabled}
        onChange={(event) => {
          handleFiles(event.target.files);
          event.target.value = "";
        }}
        aria-describedby={helpText && inputId ? `${inputId}-help` : undefined}
      />
      <div className="file-dropzone__text">
        <span className="file-dropzone__title">Arraste arquivos aqui ou clique para selecionar</span>
        {summaryText && <span className="file-dropzone__meta">{summaryText}</span>}
        {helpText && (
          <span id={`${inputId}-help`} className="small file-help">
            {helpText}
          </span>
        )}
      </div>
    </div>
  );
};
