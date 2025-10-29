export class ProcessMessageDto {
  constructor(
    public readonly userId: string,
    public readonly message: string,
    public readonly area?: string[],
    public readonly category?: string[],
    public readonly source?: string[],
    public readonly tags?: string[]
  ) {}

  static create(object: { [key: string]: any }): [string?, ProcessMessageDto?] {
    const { userId, message, area, category, source, tags } = object

    if (!userId) return ['El userId es requerido']
    if (!message) return ['El mensaje es requerido']
    if (typeof userId !== 'string')
      return ['El userId debe ser una cadena de texto']
    if (typeof message !== 'string')
      return ['El mensaje debe ser una cadena de texto']
    if (message.trim().length === 0) return ['El mensaje no puede estar vacío']

    // Validar arrays opcionales si están presentes
    if (
      area !== undefined &&
      (!Array.isArray(area) || !area.every((item) => typeof item === 'string'))
    ) {
      return ['El campo area debe ser un array de strings']
    }
    if (
      category !== undefined &&
      (!Array.isArray(category) ||
        !category.every((item) => typeof item === 'string'))
    ) {
      return ['El campo category debe ser un array de strings']
    }
    if (
      source !== undefined &&
      (!Array.isArray(source) ||
        !source.every((item) => typeof item === 'string'))
    ) {
      return ['El campo source debe ser un array de strings']
    }
    if (
      tags !== undefined &&
      (!Array.isArray(tags) || !tags.every((item) => typeof item === 'string'))
    ) {
      return ['El campo tags debe ser un array de strings']
    }

    return [
      undefined,
      new ProcessMessageDto(
        userId,
        message.trim(),
        area,
        category,
        source,
        tags
      ),
    ]
  }
}
