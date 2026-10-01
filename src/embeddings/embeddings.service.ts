import { Injectable } from '@nestjs/common';

@Injectable()
export class EmbeddingsService {
    private readonly API_URL =
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent';

    async generarEmbedding(texto: string): Promise<number[]> {
        const respuesta = await fetch(`${this.API_URL}?key=${process.env.GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                content: { parts: [{ text: texto }] },
                outputDimensionality: 768, // trunca la salida a 768 dimensiones (MRL)
            }),
        });

        if (!respuesta.ok) {
            throw new Error(`Error de Gemini (embeddings): ${respuesta.status}`);
        }

        const data = await respuesta.json();
        return data.embedding.values;
    }
}
