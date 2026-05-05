/*
  # Remplacement des secteurs d'activité

  Supprime tous les secteurs existants et insère la nouvelle liste
  correspondant aux domaines thématiques de la capture d'écran.
*/

DELETE FROM activity_sectors;

INSERT INTO activity_sectors (name, is_active) VALUES
  ('Digitalisation : Intelligence artificielle, Cybersécurité, IoT', true),
  ('Bio-informatique et biotechnologies', true),
  ('Énergies renouvelables et systèmes électriques (Smart Grid, Smart Building)', true),
  ('Valorisation des produits locaux (agroalimentaire, bâtiment)', true),
  ('Nouveaux matériaux de construction', true),
  ('Environnement et climat', true),
  ('Potabilisation des eaux et traitement des déchets', true),
  ('Écosystème entrepreneurial et développement de start-up', true),
  ('Adaptation, diffusion et rejet de l''innovation', true),
  ('Compétitivité, légitimité et sécurité des entreprises', true),
  ('Autre', true);
