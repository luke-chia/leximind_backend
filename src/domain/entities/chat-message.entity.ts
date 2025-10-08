export class ChatMessage {
  constructor(
    public readonly userId: string,
    public readonly message: string,
    public readonly timestamp: Date = new Date(),
    public readonly area?: string[],
    public readonly category?: string[],
    public readonly source?: string[],
    public readonly tags?: string[]
  ) {}
}
