import 'dotenv/config';
// seed.ts vive en prisma/, el cliente generado vive en src/generated/prisma — de ahí el ../src/
import { PrismaClient } from '../src/generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// __dirname no existe en ESM nativo. tsx intenta simularlo, pero no siempre
// resuelve la ruta correcta — esta es la forma estable de calcularlo:
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function generarEmbedding(texto: string): Promise<number[]> {
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
    const data = await respuesta.json();
    return data.embedding.values;
}

async function main() {
    const rutaCsv = path.join(__dirname, 'productos-prueba.json');
    const productos = JSON.parse(fs.readFileSync(rutaCsv, 'utf-8'));

    for (const producto of productos) {
        const embedding = await generarEmbedding(`${producto.name}: ${producto.description}`);
        // pgvector espera el formato de texto "[0.1,0.2,...]" (corchetes). Si se pasa el
        // arreglo de JS directo al $executeRaw, Prisma lo serializa como arreglo nativo de
        // Postgres ("{0.1,0.2,...}", con llaves), que Postgres rechaza para una columna vector.
        const embeddingVector = `[${embedding.join(',')}]`;
        await prisma.$executeRaw`
      INSERT INTO products (sku, name, description, category, price, stock, embedding)
      VALUES (${producto.sku}, ${producto.name}, ${producto.description}, ${producto.category},
              ${producto.price}, ${producto.stock}, ${embeddingVector}::vector)
    `;
        console.log(`Insertado: ${producto.name}`);
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());