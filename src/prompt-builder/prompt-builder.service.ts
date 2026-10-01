import { Injectable } from '@nestjs/common';
import type { Message } from '../generated/prisma/client.js';

@Injectable()
export class PromptBuilderService {
    construir(historial: Message[], mensajeNuevo: string, contexto: any): string {
        if (!contexto.hayContextoSuficiente) {
            return `Eres el asistente interno de diagnóstico de Hidroequipos y Albercas.
No se encontró información suficiente en el catálogo/base de conocimiento para: "${mensajeNuevo}".
Indica que no hay información suficiente y sugiere escalar a un supervisor. No inventes productos ni dosis.`;
        }

        const historialTexto = historial
            .map(m => `${m.role === 'user' ? 'Empleado' : 'Asistente'}: ${m.content}`)
            .join('\n');
        const productosTexto = contexto.productos
            .map((p: any) => `- ${p.name} (stock: ${p.stock}, precio: $${p.price}): ${p.description}`)
            .join('\n');
        const articulosTexto = contexto.articulos
            .map((a: any) => `- ${a.title}: ${a.description}`)
            .join('\n');

        return `Eres el asistente interno de diagnóstico de Hidroequipos y Albercas.
Tu trabajo es ayudar a EMPLEADOS a diagnosticar problemas de albercas y recomendar tratamientos.

REGLAS ESTRICTAS:
- Recomienda ÚNICAMENTE productos de la lista de "Productos disponibles".
- Si ningún producto aplica, dilo explícitamente en vez de inventar uno.
- Nunca generes dosis que no estén respaldadas por el contexto.
- Sé breve y directo.

Historial reciente:
${historialTexto || '(sin mensajes previos)'}

Productos disponibles relevantes:
${productosTexto || '(ninguno encontrado)'}

Procedimientos relevantes:
${articulosTexto || '(ninguno encontrado)'}

Pregunta actual del empleado: ${mensajeNuevo}

Genera un diagnóstico y plan de mantenimiento citando explícitamente los productos por nombre.`;
    }
}
