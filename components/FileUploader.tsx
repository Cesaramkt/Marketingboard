import React, { useRef, useState } from 'react';

interface FileUploaderProps {
  onFileSelect: (file: File) => void;
  uploadedFileName: string | null | undefined;
  disabled?: boolean;
}

const UploadIcon: React.FC<{className?: string}> = ({className}) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
);

export const FileUploader: React.FC<FileUploaderProps> = ({ onFileSelect, uploadedFileName, disabled = false }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  };
  
  const handleButtonClick = () => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (!disabled) {
      setIsDraggingOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setIsDraggingOver(false);
    if (disabled) return;

    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      onFileSelect(file);
    } else {
      alert("Por favor, solte apenas arquivos de imagem.");
    }
  };

  return (
    <div>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept="image/png, image/jpeg, image/webp"
        disabled={disabled}
      />
      <button
        onClick={handleButtonClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        disabled={disabled}
        className={`w-full p-4 rounded-lg border-2 border-dashed transition-all duration-300 flex flex-col items-center justify-center space-y-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-gray-50 disabled:hover:border-gray-300 ${isDraggingOver ? 'bg-purple-50 border-purple-400' : 'bg-gray-50 hover:bg-purple-50 text-gray-700 border-gray-300 hover:border-purple-400'}`}
      >
        <UploadIcon className="h-8 w-8 text-gray-500"/>
        {uploadedFileName && !disabled ? (
            <span className="text-sm font-medium text-purple-600">{uploadedFileName}</span>
        ) : (
            <span className="font-medium text-gray-600 text-center">
              {isDraggingOver ? 'Solte a imagem aqui' : 'Arraste, cole ou clique para enviar'}
            </span>
        )}
      </button>
    </div>
  );
};