import { LLMResponse } from '../../domain/entities/llm-response.entity.js'
import {
  ProcessMessageResponseDto,
  SourceDto,
} from '../../domain/dtos/process-message-response.dto.js'
import { Source } from '../../domain/entities/source.entity.js'

export class LLMResponseMapper {

  static toProcessMessageResponseDto(
    llmResponse: LLMResponse,
    resumeQuestion: string  // ✅ NUEVO PARÁMETRO - Resumen de la pregunta
  ): ProcessMessageResponseDto {
    const sourcesDto: SourceDto[] = llmResponse.sources.map(source => 
      this.toSourceDto(source)
    )

    return new ProcessMessageResponseDto(
      llmResponse.response,
      llmResponse.timestamp.toISOString(),
      sourcesDto,
      resumeQuestion  // ✅ NUEVO CAMPO
    )
  }

  static toSourceDto(source: Source): SourceDto {
    return {
      page: source.page,
      matchingText: source.matchingText,
      source: source.source,
      documentId: source.documentId,
      score: source.score,
      signedUrl: source.signedUrl || ''  // Fallback a vacío si no existe
    }
  }
}
