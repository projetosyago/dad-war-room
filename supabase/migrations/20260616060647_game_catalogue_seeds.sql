-- Pulled from remote DB on 2026-06-16 (Wave 10 audit remediation)
-- Original version timestamp: 20260616060647
-- Original name: game_catalogue_seeds
-- This migration was previously applied to the remote project (ilogsrlbenhdzkfgexvt)
-- but was missing from the local supabase/migrations/ directory.

INSERT INTO public.heroes (slug, name, generation, portrait_url, display_order)
VALUES
  ('alcar', 'Alcar', 4, '/images/heroes/alcar.png', 100),
  ('amadeus', 'Amadeus', 1, '/images/heroes/amadeus.png', 101),
  ('amane', 'Amane', 3, '/images/heroes/amane.png', 102),
  ('ava', 'Ava', 2, '/images/heroes/ava.png', 103),
  ('charles', 'Charles', 7, '/images/heroes/charles.png', 104),
  ('chenko', 'Chenko', 5, '/images/heroes/chenko.png', 105),
  ('diana', 'Diana', 6, '/images/heroes/diana.png', 106),
  ('edwin', 'Edwin', 2, '/images/heroes/edwin.png', 107),
  ('eric', 'Eric', 3, '/images/heroes/eric.png', 108),
  ('fahd', 'Fahd', 4, '/images/heroes/fahd.png', 109),
  ('forrest', 'Forrest', 3, '/images/heroes/forrest.png', 110),
  ('gordon', 'Gordon', 1, '/images/heroes/gordon.png', 111),
  ('helga', 'Helga', 5, '/images/heroes/helga.png', 112),
  ('hilde', 'Hilde', 6, '/images/heroes/hilde.png', 113),
  ('howard', 'Howard', 1, '/images/heroes/howard.png', 114),
  ('jabel', 'Jabel', 7, '/images/heroes/jabel.png', 115),
  ('jaegar', 'Jaegar', 5, '/images/heroes/jaegar.png', 116),
  ('long-fei', 'Long Fei', 6, '/images/heroes/long-fei.png', 117),
  ('margot', 'Margot', 2, '/images/heroes/margot.png', 118),
  ('marlin', 'Marlin', 2, '/images/heroes/marlin.png', 119),
  ('olive', 'Olive', 4, '/images/heroes/olive.png', 120),
  ('petra', 'Petra', 6, '/images/heroes/petra.png', 121),
  ('quinn', 'Quinn', 3, '/images/heroes/quinn.png', 122),
  ('rosa', 'Rosa', 5, '/images/heroes/rosa.png', 123),
  ('saul', 'Saul', 7, '/images/heroes/saul.png', 124),
  ('seth', 'Seth', 5, '/images/heroes/seth.png', 125),
  ('sophia', 'Sophia', 4, '/images/heroes/sophia.png', 126),
  ('thrud', 'Thrud', 7, '/images/heroes/thrud.png', 127),
  ('triton', 'Triton', 6, '/images/heroes/triton.png', 128),
  ('wee-woo', 'Wee Woo', 1, '/images/heroes/wee-woo.png', 129),
  ('yang', 'Yang', 4, '/images/heroes/yang.png', 130),
  ('yeonwoo', 'Yeonwoo', 7, '/images/heroes/yeonwoo.png', 131),
  ('zoe', 'Zoe', 5, '/images/heroes/zoe.png', 132)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.troop_tiers (tier_label, is_truegold, display_order, training_building_level, icon_url) VALUES
  ('T1', false, 10, 1, NULL),
  ('T2', false, 20, 4, NULL),
  ('T3', false, 30, 7, NULL),
  ('T4', false, 40, 11, NULL),
  ('T5', false, 50, 13, NULL),
  ('T6', false, 60, 16, NULL),
  ('T7', false, 70, 19, NULL),
  ('T8', false, 80, 22, NULL),
  ('T9', false, 90, 26, NULL),
  ('T10', false, 100, 30, NULL),
  ('TG1', true, 110, NULL, '/images/tiers/tg1.png'),
  ('TG2', true, 120, NULL, '/images/tiers/tg2.png'),
  ('TG3', true, 130, NULL, '/images/tiers/tg3.png'),
  ('TG4', true, 140, NULL, '/images/tiers/tg4.png'),
  ('TG5', true, 150, NULL, '/images/tiers/tg5.png'),
  ('TG6', true, 160, NULL, '/images/tiers/tg6.png'),
  ('TG7', true, 170, NULL, '/images/tiers/tg7.png'),
  ('TG8', true, 180, NULL, '/images/tiers/tg8.png')
ON CONFLICT (tier_label) DO NOTHING;

INSERT INTO public.masters (slug, name, unlock_order) VALUES
  ('valora', 'Valora', 1),
  ('pan', 'Pan', 2),
  ('roman', 'Roman', 3),
  ('cassia', 'Cassia', 4)
ON CONFLICT (slug) DO NOTHING;
