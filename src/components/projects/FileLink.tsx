import React, { useState, useEffect } from 'react';
import { FileText, ExternalLink, AlertCircle } from 'lucide-react';
import { getFileUrl, formatFileSize, UploadedFile } from '../../utils/fileUpload';

interface FileLinkProps {
  file: UploadedFile;
}

const FileLink: React.FC<FileLinkProps> = ({ file }) => {
  const [fileUrl, setFileUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadFileUrl = async () => {
      if (!file.path) {
        setError('Chemin du fichier manquant');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const url = await getFileUrl(file.path);
        setFileUrl(url);
      } catch (err) {
        console.error('Error loading file URL:', err);
        setError('Impossible de charger le fichier');
      } finally {
        setIsLoading(false);
      }
    };

    loadFileUrl();
  }, [file.path]);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (isLoading) return;

    try {
      const freshUrl = await getFileUrl(file.path);
      window.open(freshUrl, '_blank', 'noopener,noreferrer');
    } catch (err) {
      console.error('Error refreshing file URL:', err);
      setError('Erreur lors de l\'ouverture du fichier');
    }
  };

  if (error) {
    return (
      <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
        <div className="flex items-center space-x-3">
          <AlertCircle className="h-5 w-5 text-red-500" />
          <div>
            <p className="text-sm font-medium text-red-900">{file.name}</p>
            <p className="text-xs text-red-600">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
        <div className="flex items-center space-x-3">
          <FileText className="h-5 w-5 text-gray-400 animate-pulse" />
          <div>
            <p className="text-sm font-medium text-gray-900">{file.name}</p>
            <p className="text-xs text-gray-500">Chargement...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <a
      href={fileUrl}
      onClick={handleClick}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 hover:border-primary-300 hover:shadow-sm transition-all"
    >
      <div className="flex items-center space-x-3">
        <FileText className="h-5 w-5 text-gray-400" />
        <div>
          <p className="text-sm font-medium text-gray-900">{file.name}</p>
          <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
        </div>
      </div>
      <ExternalLink className="h-4 w-4 text-gray-400" />
    </a>
  );
};

export default FileLink;
