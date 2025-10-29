export interface SourceDto {
  page: string
  matchingText: string
  source: string
  documentId: string
  score: string
  signedUrl?: string // URL firmada del documento (opcional)
}

export class ProcessMessageResponseDto {
  constructor(
    public readonly response: string,
    public readonly timestamp: string,
    public readonly sources: SourceDto[],
    public readonly resumeQuestion: string // ✅ NUEVO CAMPO - Resumen de la pregunta (5 palabras o menos)
  ) {}
}
