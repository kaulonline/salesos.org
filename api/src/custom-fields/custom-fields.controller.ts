import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/strategies/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CustomFieldsService } from './custom-fields.service';
import { CreateCustomFieldDto } from './dto/create-custom-field.dto';
import { UpdateCustomFieldDto } from './dto/update-custom-field.dto';
import { SetFieldValueDto } from './dto/set-field-value.dto';
import { CustomFieldEntity, CustomFieldType } from '@prisma/client';

@ApiTags('Custom Fields')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('custom-fields')
export class CustomFieldsController {
  constructor(private readonly customFieldsService: CustomFieldsService) {}

  @Post()
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Create a new custom field definition' })
  async create(@Request() req, @Body() dto: CreateCustomFieldDto) {
    return this.customFieldsService.create(req.user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all custom field definitions' })
  @ApiQuery({ name: 'entity', enum: CustomFieldEntity, required: false })
  @ApiQuery({ name: 'fieldType', enum: CustomFieldType, required: false })
  @ApiQuery({ name: 'isActive', type: Boolean, required: false })
  async findAll(
    @Query('entity') entity?: CustomFieldEntity,
    @Query('fieldType') fieldType?: CustomFieldType,
    @Query('isActive') isActive?: string,
  ) {
    return this.customFieldsService.findAll({
      entity,
      fieldType,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
    });
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get custom fields statistics' })
  async getStats() {
    return this.customFieldsService.getStats();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a custom field definition by ID' })
  async findOne(@Param('id') id: string) {
    return this.customFieldsService.findOne(id);
  }

  @Patch(':id')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Update a custom field definition' })
  async update(@Param('id') id: string, @Body() dto: UpdateCustomFieldDto) {
    return this.customFieldsService.update(id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Delete a custom field definition' })
  async remove(@Param('id') id: string) {
    return this.customFieldsService.remove(id);
  }

  @Post('reorder')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Reorder custom fields' })
  async reorder(@Body() body: { fieldIds: string[] }) {
    return this.customFieldsService.reorder(body.fieldIds);
  }

  // Picklist management
  @Post(':id/picklist-values')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Add a picklist value' })
  async addPicklistValue(
    @Param('id') id: string,
    @Body() body: { value: string; label: string },
  ) {
    return this.customFieldsService.addPicklistValue(id, body);
  }

  @Patch(':id/picklist-values/:valueId')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Update a picklist value' })
  async updatePicklistValue(
    @Param('id') id: string,
    @Param('valueId') valueId: string,
    @Body() body: { label?: string; isActive?: boolean },
  ) {
    return this.customFieldsService.updatePicklistValue(id, valueId, body);
  }

  @Post(':id/picklist-values/reorder')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Reorder picklist values' })
  async reorderPicklistValues(
    @Param('id') id: string,
    @Body() body: { valueIds: string[] },
  ) {
    return this.customFieldsService.reorderPicklistValues(id, body.valueIds);
  }

  // Field values management
  @Post('values')
  @ApiOperation({ summary: 'Set a custom field value for a record' })
  async setFieldValue(@Body() dto: SetFieldValueDto) {
    return this.customFieldsService.setFieldValue(
      dto.fieldId,
      dto.entityType,
      dto.entityId,
      dto.value,
    );
  }

  @Get('values/:entityType/:entityId')
  @ApiOperation({ summary: 'Get all custom field values for a record' })
  async getFieldValues(
    @Param('entityType') entityType: CustomFieldEntity,
    @Param('entityId') entityId: string,
  ) {
    return this.customFieldsService.getFieldValues(entityType, entityId);
  }

  @Delete('values/:fieldId/:entityType/:entityId')
  @ApiOperation({ summary: 'Delete a custom field value' })
  async deleteFieldValue(
    @Param('fieldId') fieldId: string,
    @Param('entityType') entityType: CustomFieldEntity,
    @Param('entityId') entityId: string,
  ) {
    return this.customFieldsService.deleteFieldValue(fieldId, entityType, entityId);
  }
}
