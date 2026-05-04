import { supabase } from '../services/supabaseService';

export interface UploadedFile {
  name: string;
  path: string;
  size: number;
  type: string;
  url: string;
}

export const uploadFile = async (
  projectId: string,
  file: File
): Promise<UploadedFile> => {
  if (!supabase) {
    throw new Error('Supabase client not available');
  }

  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
  const filePath = `${projectId}/${fileName}`;

  const { data, error } = await supabase.storage
    .from('submission-files')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) {
    throw new Error(`File upload failed: ${error.message}`);
  }

  // For private buckets, we store the path and generate signed URLs when needed
  const { data: signedUrlData, error: urlError } = await supabase.storage
    .from('submission-files')
    .createSignedUrl(filePath, 3600); // URL valid for 1 hour

  if (urlError) {
    console.error('Error creating signed URL:', urlError);
  }

  return {
    name: file.name,
    path: data.path,
    size: file.size,
    type: file.type,
    url: signedUrlData?.signedUrl || '' // Store signed URL or empty string
  };
};

export const deleteFile = async (filePath: string): Promise<void> => {
  const { error } = await supabase.storage
    .from('submission-files')
    .remove([filePath]);

  if (error) {
    throw new Error(`File deletion failed: ${error.message}`);
  }
};

export const getFileUrl = async (filePath: string): Promise<string> => {
  if (!supabase) {
    throw new Error('Supabase client not available');
  }

  // For private buckets, create a signed URL valid for 1 hour
  const { data, error } = await supabase.storage
    .from('submission-files')
    .createSignedUrl(filePath, 3600);

  if (error) {
    throw new Error(`Failed to get file URL: ${error.message}`);
  }

  return data.signedUrl;
};

export const downloadFile = async (filePath: string): Promise<Blob> => {
  const { data, error } = await supabase.storage
    .from('submission-files')
    .download(filePath);

  if (error) {
    throw new Error(`File download failed: ${error.message}`);
  }

  return data;
};

export const listProjectFiles = async (projectId: string): Promise<UploadedFile[]> => {
  if (!supabase) {
    throw new Error('Supabase client not available');
  }

  const { data, error } = await supabase.storage
    .from('submission-files')
    .list(projectId);

  if (error) {
    throw new Error(`Failed to list files: ${error.message}`);
  }

  // Generate signed URLs for all files
  const filesWithUrls = await Promise.all(
    data.map(async (file) => {
      const filePath = `${projectId}/${file.name}`;
      let url = '';

      try {
        url = await getFileUrl(filePath);
      } catch (error) {
        console.error(`Failed to get URL for ${filePath}:`, error);
      }

      return {
        name: file.name,
        path: filePath,
        size: file.metadata?.size || 0,
        type: file.metadata?.mimetype || '',
        url
      };
    })
  );

  return filesWithUrls;
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};
