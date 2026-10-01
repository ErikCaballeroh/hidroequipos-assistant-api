import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'csv-parse/sync';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

interface ProductoCsv {
    sku: string;
    name: string;
    description: string;
    category: string;
    price: string;
    stock: string;
    active: string;
}

interface KnowledgeBaseCsv {
    title: string;
    description: string;
}

function esperar(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

// Límite real confirmado: 100 peticiones/minuto en la capa gratuita de
// gemini-embedding-001. 700ms entre llamadas da ~85/min, con margen de
// sobra por si hay latencia de red variable.
const PAUSA_ENTRE_LLAMADAS_MS = 700;

async function generarEmbedding(texto: string, intento = 1): Promise<number[]> {
    const respuesta = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${process.env.GEMINI_API_KEY}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                content: { parts: [{ text: texto }] },
                outputDimensionality: 768,
            }),
        },
    );

    if (respuesta.status === 429) {
        if (intento > 5) {
            throw new Error('Se agotaron los reintentos tras errores 429 repetidos.');
        }
        const cuerpo = await respuesta.json().catch(() => null);
        // La API devuelve el tiempo de espera exacto en retryDelay (ej. "48s").
        const retryDelayStr: string | undefined = cuerpo?.error?.details?.find(
            (d: any) => d['@type']?.includes('RetryInfo'),
        )?.retryDelay;
        const segundos = retryDelayStr ? parseInt(retryDelayStr, 10) : 60;
        const esperaMs = (segundos + 2) * 1000; // +2s de margen de seguridad
        console.log(`  Límite de tasa alcanzado. Esperando ${segundos + 2}s antes de reintentar (intento ${intento})...`);
        await esperar(esperaMs);
        return generarEmbedding(texto, intento + 1);
    }

    if (!respuesta.ok) {
        throw new Error(`Error de Gemini (embeddings): ${respuesta.status} ${await respuesta.text()}`);
    }

    const data = await respuesta.json();
    return data.embedding.values;
}

async function sembrarProductos() {
    const ruta = path.join(__dirname, 'catalogo_productos.csv');
    const contenido = fs.readFileSync(ruta, 'utf-8');
    const productos: ProductoCsv[] = parse(contenido, { columns: true, skip_empty_lines: true });

    console.log(`Sembrando ${productos.length} productos...`);

    for (const [i, producto] of productos.entries()) {
        const embedding = await generarEmbedding(`${producto.name}: ${producto.description}`);
        const embeddingVector = `[${embedding.join(',')}]`;

        await prisma.$executeRaw`
      INSERT INTO products (sku, name, description, category, price, stock, active, embedding)
      VALUES (
        ${producto.sku}, ${producto.name}, ${producto.description}, ${producto.category},
        ${Number(producto.price)}, ${Number(producto.stock)}, ${producto.active === 'true'},
        ${embeddingVector}::vector
      )
      ON CONFLICT (sku) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        category = EXCLUDED.category,
        price = EXCLUDED.price,
        stock = EXCLUDED.stock,
        active = EXCLUDED.active,
        embedding = EXCLUDED.embedding,
        updated_at = now()
    `;

        console.log(`[${i + 1}/${productos.length}] ${producto.name}`);
        await esperar(PAUSA_ENTRE_LLAMADAS_MS);
    }
}

async function sembrarKnowledgeBase() {
    const ruta = path.join(__dirname, 'knowledge_base.csv');
    const contenido = fs.readFileSync(ruta, 'utf-8');
    const articulos: KnowledgeBaseCsv[] = parse(contenido, { columns: true, skip_empty_lines: true });

    console.log(`Sembrando ${articulos.length} artículos de base de conocimiento...`);

    for (const [i, articulo] of articulos.entries()) {
        // knowledge_base no tiene llave única — si el script se interrumpió a
        // medias antes, esto evita duplicar artículos ya insertados al reintentar.
        const yaExiste = await prisma.$queryRaw<{ id: number }[]>`
      SELECT id FROM knowledge_base WHERE title = ${articulo.title} LIMIT 1
    `;
        if (yaExiste.length > 0) {
            console.log(`[${i + 1}/${articulos.length}] ${articulo.title} (ya existe, se omite)`);
            continue;
        }

        const embedding = await generarEmbedding(`${articulo.title}: ${articulo.description}`);
        const embeddingVector = `[${embedding.join(',')}]`;

        await prisma.$executeRaw`
      INSERT INTO knowledge_base (title, description, embedding)
      VALUES (${articulo.title}, ${articulo.description}, ${embeddingVector}::vector)
    `;

        console.log(`[${i + 1}/${articulos.length}] ${articulo.title}`);
        await esperar(PAUSA_ENTRE_LLAMADAS_MS);
    }
}

async function main() {
    await sembrarProductos();
    await sembrarKnowledgeBase();
    console.log('Seed completo.');
}

main()
    .catch((error) => {
        console.error('Error en el seed:', error);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());