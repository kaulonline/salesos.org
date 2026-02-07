import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface TranscriptionResult {
  text: string;
  segments: TranscriptionSegment[];
  language: string;
  duration: number;
}

interface TranscriptionSegment {
  text: string;
  startTime: number;
  endTime: number;
  speakerLabel?: string;
  confidence?: number;
}

interface DiarizedTranscript extends TranscriptionResult {
  speakers: string[];
}

/**
 * Service for processing audio and generating transcripts using OpenAI Whisper
 */
@Injectable()
export class TranscriptProcessorService {
  private readonly logger = new Logger(TranscriptProcessorService.name);
  private readonly openaiApiKey: string;
  private readonly useAzureWhisper: boolean;
  private readonly azureWhisperEndpoint: string;
  private readonly azureWhisperDeployment: string;

  constructor(private readonly configService: ConfigService) {
    this.openaiApiKey = this.configService.get<string>('OPENAI_API_KEY', '');
    this.useAzureWhisper = !!this.configService.get<string>('AZURE_WHISPER_ENDPOINT');
    this.azureWhisperEndpoint = this.configService.get<string>('AZURE_WHISPER_ENDPOINT', '');
    this.azureWhisperDeployment = this.configService.get<string>('AZURE_WHISPER_DEPLOYMENT', 'whisper');

    this.logger.log(
      `Transcript processor initialized. Using ${this.useAzureWhisper ? 'Azure Whisper' : 'OpenAI Whisper'}`,
    );
  }

  /**
   * Transcribe audio buffer using Whisper API
   */
  async transcribe(
    audioBuffer: Buffer,
    options: {
      language?: string;
      prompt?: string;
      format?: 'wav' | 'mp3' | 'webm';
    } = {},
  ): Promise<TranscriptionResult> {
    const { language = 'en', prompt, format = 'wav' } = options;

    this.logger.log(`Transcribing audio (${audioBuffer.length} bytes, ${format} format)`);

    if (this.useAzureWhisper) {
      return this.transcribeWithAzure(audioBuffer, language, prompt, format);
    }

    return this.transcribeWithOpenAI(audioBuffer, language, prompt, format);
  }

  /**
   * Transcribe using OpenAI Whisper API
   */
  private async transcribeWithOpenAI(
    audioBuffer: Buffer,
    language: string,
    prompt?: string,
    format: string = 'wav',
  ): Promise<TranscriptionResult> {
    const formData = new FormData();
    // Convert Node.js Buffer to ArrayBuffer for Blob compatibility
    const arrayBuffer = audioBuffer.buffer.slice(
      audioBuffer.byteOffset,
      audioBuffer.byteOffset + audioBuffer.byteLength,
    ) as ArrayBuffer;
    const blob = new Blob([arrayBuffer], { type: `audio/${format}` });
    formData.append('file', blob, `audio.${format}`);
    formData.append('model', 'whisper-1');
    formData.append('response_format', 'verbose_json');
    formData.append('language', language);
    formData.append('timestamp_granularities[]', 'segment');
    formData.append('timestamp_granularities[]', 'word');
    
    if (prompt) {
      formData.append('prompt', prompt);
    }

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.openaiApiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI Whisper error: ${error}`);
    }

    const data = await response.json();

    return {
      text: data.text,
      segments: (data.segments || []).map((seg: any) => ({
        text: seg.text,
        startTime: seg.start,
        endTime: seg.end,
        confidence: seg.confidence,
      })),
      language: data.language,
      duration: data.duration,
    };
  }

  /**
   * Transcribe using Azure OpenAI Whisper deployment
   */
  private async transcribeWithAzure(
    audioBuffer: Buffer,
    language: string,
    prompt?: string,
    format: string = 'wav',
  ): Promise<TranscriptionResult> {
    const url = `${this.azureWhisperEndpoint}/openai/deployments/${this.azureWhisperDeployment}/audio/transcriptions?api-version=2024-02-01`;

    const formData = new FormData();
    // Convert Node.js Buffer to ArrayBuffer for Blob compatibility
    const arrayBuffer = audioBuffer.buffer.slice(
      audioBuffer.byteOffset,
      audioBuffer.byteOffset + audioBuffer.byteLength,
    ) as ArrayBuffer;
    const blob = new Blob([arrayBuffer], { type: `audio/${format}` });
    formData.append('file', blob, `audio.${format}`);
    formData.append('response_format', 'verbose_json');
    formData.append('language', language);
    formData.append('timestamp_granularities[]', 'segment');
    
    if (prompt) {
      formData.append('prompt', prompt);
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'api-key': this.configService.get<string>('AZURE_WHISPER_API_KEY', ''),
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Azure Whisper error: ${error}`);
    }

    const data = await response.json();

    return {
      text: data.text,
      segments: (data.segments || []).map((seg: any) => ({
        text: seg.text,
        startTime: seg.start,
        endTime: seg.end,
        confidence: seg.confidence,
      })),
      language: data.language,
      duration: data.duration,
    };
  }

  /**
   * Transcribe with speaker diarization
   * Uses pyannote.audio for diarization (requires separate service)
   */
  async transcribeWithDiarization(
    audioBuffer: Buffer,
    options: {
      language?: string;
      numSpeakers?: number;
    } = {},
  ): Promise<DiarizedTranscript> {
    this.logger.log('Transcribing with speaker diarization');

    // First, get regular transcription
    const transcription = await this.transcribe(audioBuffer, {
      language: options.language,
    });

    // Then, get speaker diarization (would call external diarization service)
    // For now, return transcription without diarization
    this.logger.warn('Speaker diarization not yet implemented - returning basic transcription');

    return {
      ...transcription,
      speakers: [],
    };

    /* Full implementation would call diarization service:
    
    // Send audio to diarization service
    const diarizationResponse = await fetch(`${this.diarizationServiceUrl}/diarize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/octet-stream' },
      body: audioBuffer,
    });
    
    const diarization = await diarizationResponse.json();
    
    // Merge diarization with transcription
    const diarizedSegments = this.mergeDiarizationWithTranscription(
      transcription.segments,
      diarization.speakers,
    );
    
    return {
      ...transcription,
      segments: diarizedSegments,
      speakers: diarization.speakerLabels,
    };
    */
  }

  /**
   * Process real-time audio stream chunk
   */
  async processAudioChunk(
    chunk: Buffer,
    sessionId: string,
    chunkIndex: number,
  ): Promise<TranscriptionSegment[]> {
    this.logger.log(
      `Processing audio chunk ${chunkIndex} for session ${sessionId} (${chunk.length} bytes)`,
    );

    // Transcribe the chunk
    const result = await this.transcribe(chunk);

    // Adjust timestamps based on chunk index (assuming 30-second chunks)
    const chunkOffsetSeconds = chunkIndex * 30;
    
    return result.segments.map((seg) => ({
      ...seg,
      startTime: seg.startTime + chunkOffsetSeconds,
      endTime: seg.endTime + chunkOffsetSeconds,
    }));
  }

  /**
   * Validate audio format
   */
  validateAudioFormat(buffer: Buffer): { valid: boolean; format?: string; error?: string } {
    // Check for WAV header
    if (buffer.length > 4 && buffer.toString('utf8', 0, 4) === 'RIFF') {
      return { valid: true, format: 'wav' };
    }

    // Check for MP3 header (ID3 or sync bits)
    if (
      (buffer.length > 3 && buffer.toString('utf8', 0, 3) === 'ID3') ||
      (buffer.length > 2 && buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0)
    ) {
      return { valid: true, format: 'mp3' };
    }

    // Check for WebM/Matroska
    if (buffer.length > 4 && buffer[0] === 0x1a && buffer[1] === 0x45 && buffer[2] === 0xdf && buffer[3] === 0xa3) {
      return { valid: true, format: 'webm' };
    }

    return { valid: false, error: 'Unsupported audio format' };
  }

  /**
   * Convert audio to WAV format (if needed)
   */
  async convertToWav(audioBuffer: Buffer, sourceFormat: string): Promise<Buffer> {
    // For now, return as-is (would use ffmpeg for actual conversion)
    this.logger.warn(`Audio conversion from ${sourceFormat} to WAV not implemented`);
    return audioBuffer;
  }
}
