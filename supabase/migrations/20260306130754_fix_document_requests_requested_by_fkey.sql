/*
  # Fix document_requests requested_by foreign key

  1. Changes
    - Drop the existing foreign key constraint on requested_by that references auth.users
    - Create a new foreign key constraint that references public.users instead
    
  2. Reason
    - The application uses public.users.id for user identification
    - The previous constraint referenced auth.users.id which caused insert failures
*/

-- Drop the existing foreign key constraint
ALTER TABLE document_requests 
DROP CONSTRAINT IF EXISTS document_requests_requested_by_fkey;

-- Add new foreign key constraint to public.users
ALTER TABLE document_requests 
ADD CONSTRAINT document_requests_requested_by_fkey 
FOREIGN KEY (requested_by) REFERENCES public.users(id);
