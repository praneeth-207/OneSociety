export interface OCRResult {
  text: string;
  confidence: number;
}

export interface IOCRAdapter {
  extractText(buffer: Buffer): Promise<OCRResult>;
}

export class MockOCRAdapter implements IOCRAdapter {
  public async extractText(buffer: Buffer): Promise<OCRResult> {
    // If buffer contains text-like bytes or for demo documents
    return {
      text: 'CERTIFICATE OF PROFICIENCY. This is to certify that the candidate has completed electrical wiring and civil repair training.',
      confidence: 0.92,
    };
  }
}

export class OCRService {
  private adapter: IOCRAdapter;

  constructor(adapter?: IOCRAdapter) {
    this.adapter = adapter || new MockOCRAdapter();
  }

  public async processDocument(buffer: Buffer): Promise<OCRResult> {
    return this.adapter.extractText(buffer);
  }
}

export const ocrService = new OCRService();
