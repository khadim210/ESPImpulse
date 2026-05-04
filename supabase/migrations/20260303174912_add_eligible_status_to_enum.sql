/*
  # Add eligible status to project_status enum

  1. Changes
    - Add 'eligible' value to project_status enum for projects that pass eligibility evaluation
    
  2. Notes
    - This status is used after eligibility evaluation and before pre_selection
*/

ALTER TYPE project_status ADD VALUE IF NOT EXISTS 'eligible' AFTER 'submitted';