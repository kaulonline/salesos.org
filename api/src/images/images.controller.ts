import {
  Controller,
  Get,
  Query,
  Param,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
  Res,
  HttpStatus,
  Header,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import type { Response } from 'express';
import { ImagesService } from './images.service';
import { JwtAuthGuard } from '../auth/strategies/jwt-auth.guard';

@ApiTags('Images')
@ApiBearerAuth('JWT')
@Controller('images')
export class ImagesController {
  constructor(private readonly imagesService: ImagesService) {}

  /**
   * Proxy endpoint for Pexels images
   * GET /api/images/proxy?url=<encoded-pexels-url>
   * No auth required - images are public but proxied through our server
   */
  @Get('proxy')
  @Header('Cache-Control', 'public, max-age=86400, immutable')
  async proxyImage(
    @Query('url') url: string,
    @Res() res: Response,
  ) {
    if (!url) {
      return res.status(HttpStatus.BAD_REQUEST).json({ error: 'URL parameter required' });
    }

    const result = await this.imagesService.proxyImage(url);

    if (!result) {
      return res.status(HttpStatus.NOT_FOUND).json({ error: 'Image not found' });
    }

    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Length', result.buffer.length);
    return res.send(result.buffer);
  }

  /**
   * Search for photos via Pexels API proxy
   * GET /api/images/search?query=business&perPage=15&page=1&orientation=landscape
   */
  @Get('search')
  @UseGuards(JwtAuthGuard)
  async searchPhotos(
    @Query('query') query: string,
    @Query('perPage', new DefaultValuePipe(15), ParseIntPipe) perPage: number,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('orientation') orientation?: string,
    @Query('size') size?: string,
  ) {
    return this.imagesService.searchPhotos(query, perPage, page, orientation, size);
  }

  /**
   * Get curated photos via Pexels API proxy
   * GET /api/images/curated?perPage=15&page=1
   */
  @Get('curated')
  @UseGuards(JwtAuthGuard)
  async getCuratedPhotos(
    @Query('perPage', new DefaultValuePipe(15), ParseIntPipe) perPage: number,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
  ) {
    return this.imagesService.getCuratedPhotos(perPage, page);
  }

  /**
   * Get a specific photo by ID
   * GET /api/images/:id
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getPhoto(@Param('id', ParseIntPipe) id: number) {
    return this.imagesService.getPhoto(id);
  }
}
