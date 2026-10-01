-- Se quitan los índices ivfflat agregados a mano en la migración inicial.
-- Se crearon con "lists = 100" (el valor genérico de la guía de desarrollo,
-- pensado para catálogos grandes) sin ajustarlo al tamaño real de las tablas
-- (12 productos en el momento de este fix). ivfflat es un índice APROXIMADO:
-- con tan pocas filas repartidas en 100 clusters, la mayoría de los clusters
-- quedan vacíos y la búsqueda (que por defecto sondea 1 solo cluster,
-- ivfflat.probes = 1) puede devolver 0 filas aunque exista un match
-- semántico perfecto en la tabla — sin ningún error, de forma silenciosa.
-- Esto causaba que RetrievalService.buscarContexto() recibiera siempre
-- arreglos vacíos, mejorDistancia = Infinity, y por lo tanto
-- hayContextoSuficiente: false en todas las consultas.
--
-- Sin índice, "embedding <=> $1::vector" hace un sequential scan exacto
-- sobre la tabla — correcto, y a esta escala (decenas/cientos de filas) más
-- rápido que mantener un índice aproximado mal calibrado. Cuando el catálogo
-- crezca a miles de filas, reindexar con "lists" calculado sobre el conteo
-- real (pgvector recomienda rows / 1000, o sqrt(rows) para tablas grandes),
-- o evaluar HNSW, que no sufre este problema de "arranque en frío".

-- DropIndex
DROP INDEX IF EXISTS "idx_knowledge_base_embedding";

-- DropIndex
DROP INDEX IF EXISTS "idx_products_embedding";
