import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface PexelsPhoto {
  id: number;
  width: number;
  height: number;
  url: string;
  photographer: string;
  photographer_url: string;
  photographer_id: number;
  avg_color: string;
  src: {
    original: string;
    large2x: string;
    large: string;
    medium: string;
    small: string;
    portrait: string;
    landscape: string;
    tiny: string;
  };
  alt: string;
}

export interface PexelsSearchResponse {
  total_results: number;
  page: number;
  per_page: number;
  photos: PexelsPhoto[];
  next_page?: string;
}

@Injectable()
export class ImagesService {
  private readonly logger = new Logger(ImagesService.name);
  private readonly pexelsApiKey: string;
  private readonly pexelsBaseUrl = 'https://api.pexels.com/v1';
  private readonly apiBaseUrl: string;

  constructor(private configService: ConfigService) {
    // SECURITY: No hardcoded API key fallback - require env variable
    this.pexelsApiKey = this.configService.get<string>('PEXELS_API_KEY') || '';
    if (!this.pexelsApiKey && process.env.NODE_ENV === 'production') {
      this.logger.warn('PEXELS_API_KEY not configured - image search will be disabled');
    }
    this.apiBaseUrl = this.configService.get<string>('API_BASE_URL') || 'https://engage.iriseller.com';
  }

  /**
   * Transform Pexels image URLs to use our proxy
   */
  private transformImageUrl(url: string): string {
    if (!url) return url;
    // Encode the Pexels URL and route through our proxy
    return `${this.apiBaseUrl}/api/images/proxy?url=${encodeURIComponent(url)}`;
  }

  /**
   * Transform all image URLs in a photo object to use our proxy
   */
  private transformPhotoUrls(photo: PexelsPhoto): PexelsPhoto {
    return {
      ...photo,
      src: {
        original: this.transformImageUrl(photo.src.original),
        large2x: this.transformImageUrl(photo.src.large2x),
        large: this.transformImageUrl(photo.src.large),
        medium: this.transformImageUrl(photo.src.medium),
        small: this.transformImageUrl(photo.src.small),
        portrait: this.transformImageUrl(photo.src.portrait),
        landscape: this.transformImageUrl(photo.src.landscape),
        tiny: this.transformImageUrl(photo.src.tiny),
      },
    };
  }

  /**
   * Fetch an image from Pexels and return the buffer with content type
   */
  async proxyImage(url: string): Promise<{ buffer: Buffer; contentType: string } | null> {
    try {
      // Validate that the URL is from Pexels
      const decodedUrl = decodeURIComponent(url);
      if (!decodedUrl.includes('pexels.com')) {
        this.logger.warn(`Invalid proxy request for non-Pexels URL: ${decodedUrl}`);
        return null;
      }

      const response = await fetch(decodedUrl);

      if (!response.ok) {
        this.logger.error(`Failed to fetch image: ${response.status}`);
        return null;
      }

      const contentType = response.headers.get('content-type') || 'image/jpeg';
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      return { buffer, contentType };
    } catch (error) {
      this.logger.error(`Image proxy failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Search Pexels for photos
   */
  async searchPhotos(
    query: string,
    perPage = 15,
    page = 1,
    orientation?: string,
    size?: string,
  ): Promise<PexelsSearchResponse> {
    // Return empty result if API key not configured
    if (!this.pexelsApiKey) {
      this.logger.warn('Pexels API key not configured - returning empty results');
      return { total_results: 0, page, per_page: perPage, photos: [] };
    }

    try {
      const params = new URLSearchParams({
        query,
        per_page: perPage.toString(),
        page: page.toString(),
      });

      if (orientation) params.append('orientation', orientation);
      if (size) params.append('size', size);

      const response = await fetch(`${this.pexelsBaseUrl}/search?${params}`, {
        headers: {
          Authorization: this.pexelsApiKey,
        },
      });

      if (!response.ok) {
        this.logger.error(`Pexels API error: ${response.status}`);
        return { total_results: 0, page, per_page: perPage, photos: [] };
      }

      const data: PexelsSearchResponse = await response.json();
      // Transform all image URLs to use our proxy
      return {
        ...data,
        photos: data.photos.map((photo) => this.transformPhotoUrls(photo)),
      };
    } catch (error) {
      this.logger.error(`Pexels search failed: ${error.message}`);
      return { total_results: 0, page, per_page: perPage, photos: [] };
    }
  }

  /**
   * Get curated photos from Pexels
   */
  async getCuratedPhotos(perPage = 15, page = 1): Promise<PexelsSearchResponse> {
    try {
      const params = new URLSearchParams({
        per_page: perPage.toString(),
        page: page.toString(),
      });

      const response = await fetch(`${this.pexelsBaseUrl}/curated?${params}`, {
        headers: {
          Authorization: this.pexelsApiKey,
        },
      });

      if (!response.ok) {
        this.logger.error(`Pexels API error: ${response.status}`);
        return { total_results: 0, page, per_page: perPage, photos: [] };
      }

      const data: PexelsSearchResponse = await response.json();
      // Transform all image URLs to use our proxy
      return {
        ...data,
        photos: data.photos.map((photo) => this.transformPhotoUrls(photo)),
      };
    } catch (error) {
      this.logger.error(`Pexels curated failed: ${error.message}`);
      return { total_results: 0, page, per_page: perPage, photos: [] };
    }
  }

  /**
   * Get a specific photo by ID
   */
  async getPhoto(id: number): Promise<PexelsPhoto | null> {
    try {
      const response = await fetch(`${this.pexelsBaseUrl}/photos/${id}`, {
        headers: {
          Authorization: this.pexelsApiKey,
        },
      });

      if (!response.ok) {
        this.logger.error(`Pexels API error: ${response.status}`);
        return null;
      }

      const photo: PexelsPhoto = await response.json();
      // Transform image URLs to use our proxy
      return this.transformPhotoUrls(photo);
    } catch (error) {
      this.logger.error(`Pexels get photo failed: ${error.message}`);
      return null;
    }
  }
}
