export class Source {
  constructor(
    public readonly page: string,
    public readonly matchingText: string,
    public readonly source: string,
    public readonly documentId: string,
    public readonly score: string,
    public readonly signedUrl: string
  ) {}
}
