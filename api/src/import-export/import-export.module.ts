import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ImportExportController } from './import-export.controller';
import { ImportExportService } from './import-export.service';
import { CsvParser } from './parsers/csv.parser';
import { ExcelParser } from './parsers/excel.parser';
import { AIMappingService } from './ai-mapping.service';
import { MigrationService } from './migration.service';
import { DataTransformationService } from './data-transformation.service';
import { TemplateGeneratorService } from './template-generator.service';
import { PrismaModule } from '../database/prisma.module';
import { AnthropicModule } from '../anthropic/anthropic.module';

@Module({
  imports: [
    PrismaModule,
    AnthropicModule,
    MulterModule.register({
      storage: memoryStorage(),
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB limit
      },
      fileFilter: (req, file, callback) => {
        const allowedMimeTypes = [
          'text/csv',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'text/plain',
        ];
        const allowedExtensions = ['.csv', '.xlsx', '.xls'];
        const ext = file.originalname.toLowerCase().slice(file.originalname.lastIndexOf('.'));

        if (allowedMimeTypes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
          callback(null, true);
        } else {
          callback(new Error('Only CSV and Excel files are allowed'), false);
        }
      },
    }),
  ],
  controllers: [ImportExportController],
  providers: [
    ImportExportService,
    CsvParser,
    ExcelParser,
    AIMappingService,
    MigrationService,
    DataTransformationService,
    TemplateGeneratorService,
  ],
  exports: [ImportExportService, MigrationService],
})
export class ImportExportModule {}
