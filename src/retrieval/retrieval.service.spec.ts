import { describe, it, expect, vi } from 'vitest';
import { RetrievalService } from './retrieval.service.js';

describe('RetrievalService', () => {
  it('marca hayContextoSuficiente en false cuando la distancia supera el umbral', async () => {
    const prismaMock = {
      $queryRaw: vi.fn().mockResolvedValue([{ id: 1, distance: 0.9 }]),
    };
    const embeddingsMock = { generarEmbedding: vi.fn().mockResolvedValue([0.1, 0.2]) };

    const service = new RetrievalService(prismaMock as any, embeddingsMock as any);
    const resultado = await service.buscarContexto('pregunta sin relación');

    expect(resultado.hayContextoSuficiente).toBe(false);
  });

  it('marca hayContextoSuficiente en true cuando la distancia está dentro del umbral', async () => {
    const prismaMock = {
      $queryRaw: vi.fn().mockResolvedValue([{ id: 1, distance: 0.1 }]),
    };
    const embeddingsMock = { generarEmbedding: vi.fn().mockResolvedValue([0.1, 0.2]) };

    const service = new RetrievalService(prismaMock as any, embeddingsMock as any);
    const resultado = await service.buscarContexto('agua verde con algas');

    expect(resultado.hayContextoSuficiente).toBe(true);
  });
});
