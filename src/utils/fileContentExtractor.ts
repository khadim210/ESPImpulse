import { supabase } from '../services/supabaseService';
import mammoth from 'mammoth';

export interface FileContent {
  fileName: string;
  fileType: string;
  content: string;
  extractedSuccessfully: boolean;
  error?: string;
}

export const extractFileContent = async (filePath: string, fileName: string): Promise<FileContent> => {
  try {
    const { data, error } = await supabase.storage
      .from('submission-files')
      .download(filePath);

    if (error) {
      return {
        fileName,
        fileType: getFileType(fileName),
        content: '',
        extractedSuccessfully: false,
        error: `Erreur de téléchargement: ${error.message}`
      };
    }

    const fileType = getFileType(fileName);
    let extractedContent = '';

    switch (fileType) {
      case 'text':
      case 'csv':
      case 'json':
      case 'xml':
        extractedContent = await extractTextContent(data);
        break;

      case 'pdf':
        extractedContent = await extractPDFContent(data);
        break;

      case 'docx':
      case 'doc':
        extractedContent = await extractWordContent(data, fileName);
        break;

      case 'xlsx':
      case 'xls':
        extractedContent = await extractExcelContent(data, fileName);
        break;

      case 'image':
        extractedContent = `[Image: ${fileName}] - Analyse visuelle non disponible dans cette version`;
        break;

      default:
        extractedContent = `[Fichier ${fileType.toUpperCase()}: ${fileName}] - Extraction de contenu non supportée pour ce type de fichier`;
    }

    return {
      fileName,
      fileType,
      content: extractedContent,
      extractedSuccessfully: true
    };
  } catch (error) {
    return {
      fileName,
      fileType: getFileType(fileName),
      content: '',
      extractedSuccessfully: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    };
  }
};

const getFileType = (fileName: string): string => {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';

  const typeMap: Record<string, string> = {
    'txt': 'text',
    'md': 'text',
    'csv': 'csv',
    'json': 'json',
    'xml': 'xml',
    'pdf': 'pdf',
    'doc': 'doc',
    'docx': 'docx',
    'xls': 'xls',
    'xlsx': 'xlsx',
    'jpg': 'image',
    'jpeg': 'image',
    'png': 'image',
    'gif': 'image',
    'webp': 'image'
  };

  return typeMap[ext] || 'unknown';
};

const extractTextContent = async (blob: Blob): Promise<string> => {
  try {
    const text = await blob.text();
    return text.trim();
  } catch (error) {
    return '[Erreur lors de la lecture du fichier texte]';
  }
};

const extractPDFContent = async (blob: Blob): Promise<string> => {
  try {
    const arrayBuffer = await blob.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    let text = '';
    const decoder = new TextDecoder('utf-8');

    for (let i = 0; i < uint8Array.length - 5; i++) {
      if (uint8Array[i] === 0x28 && uint8Array[i + 1] === 0x29) {
        const start = i + 2;
        let end = start;
        while (end < uint8Array.length && uint8Array[end] !== 0x29) {
          end++;
        }
        if (end < uint8Array.length) {
          const chunk = decoder.decode(uint8Array.slice(start, end));
          text += chunk + ' ';
        }
      }
    }

    if (text.trim().length > 0) {
      return text.trim();
    }

    return '[PDF détecté - Extraction de contenu limitée. Pour une extraction complète, veuillez utiliser un outil d\'extraction PDF dédié]';
  } catch (error) {
    return '[Erreur lors de l\'extraction du contenu PDF - Format non standard ou crypté]';
  }
};

const extractWordContent = async (blob: Blob, fileName: string): Promise<string> => {
  try {
    const arrayBuffer = await blob.arrayBuffer();

    const result = await mammoth.extractRawText({ arrayBuffer });

    if (result.value && result.value.trim().length > 0) {
      let extractedText = result.value.trim();

      if (result.messages && result.messages.length > 0) {
        const warnings = result.messages
          .filter(m => m.type === 'warning')
          .map(m => m.message);

        if (warnings.length > 0) {
          extractedText += '\n\n[Note: Certains éléments du document n\'ont pas pu être extraits]';
        }
      }

      return extractedText;
    } else {
      return `[Document Word: ${fileName}] - Le document semble vide ou le contenu n'a pas pu être extrait.`;
    }
  } catch (error) {
    console.error('Erreur extraction Word:', error);
    return `[Document Word: ${fileName}] - Erreur lors de l'extraction: ${error instanceof Error ? error.message : 'Erreur inconnue'}`;
  }
};

const extractExcelContent = async (blob: Blob, fileName: string): Promise<string> => {
  return `[Fichier Excel: ${fileName}] - L'extraction de contenu Excel nécessite une bibliothèque spécialisée. Le fichier a été soumis et est disponible pour analyse manuelle.`;
};

export const extractMultipleFileContents = async (
  files: Array<{ path: string; name: string }>
): Promise<FileContent[]> => {
  const promises = files.map(file => extractFileContent(file.path, file.name));
  return Promise.all(promises);
};

export const formatFileContentForPrompt = (fileContents: FileContent[]): string => {
  if (fileContents.length === 0) {
    return '';
  }

  let formatted = '\n\n=== CONTENU DES FICHIERS JOINTS ===\n\n';

  fileContents.forEach((file, index) => {
    formatted += `--- Fichier ${index + 1}: ${file.fileName} (${file.fileType.toUpperCase()}) ---\n`;

    if (file.extractedSuccessfully) {
      if (file.content.length > 0) {
        const truncatedContent = file.content.length > 4000
          ? file.content.substring(0, 4000) + '\n\n[...Contenu tronqué pour rester dans les limites. Total: ' + file.content.length + ' caractères]'
          : file.content;
        formatted += truncatedContent + '\n\n';
      } else {
        formatted += '[Fichier vide ou contenu non extractible]\n\n';
      }
    } else {
      formatted += `[Erreur d'extraction: ${file.error || 'Inconnue'}]\n\n`;
    }
  });

  formatted += '=== FIN DES FICHIERS JOINTS ===\n';

  return formatted;
};

export const shouldExtractContent = (fileType: string): boolean => {
  const extractableTypes = ['text', 'csv', 'json', 'xml', 'pdf', 'doc', 'docx'];
  return extractableTypes.includes(fileType);
};
