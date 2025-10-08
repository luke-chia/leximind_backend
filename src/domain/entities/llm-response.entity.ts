import { Source } from './source.entity.js'

export class LLMResponse {
  constructor(
    public readonly response: string,
    public readonly timestamp: Date,
    public readonly sources: Source[]
  ) {}
}
