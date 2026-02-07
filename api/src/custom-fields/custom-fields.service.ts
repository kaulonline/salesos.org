import { Injectable, BadRequestException, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CustomFieldEntity, CustomFieldType } from '@prisma/client';
import { CreateCustomFieldDto } from './dto/create-custom-field.dto';
import { UpdateCustomFieldDto } from './dto/update-custom-field.dto';

@Injectable()
export class CustomFieldsService {
  private readonly logger = new Logger(CustomFieldsService.name);

  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateCustomFieldDto) {
    // Generate API name from label
    const apiName = dto.name || this.generateApiName(dto.label);

    // Check for duplicate name
    const existing = await this.prisma.customFieldDefinition.findUnique({
      where: {
        entity_name: {
          entity: dto.entity,
          name: apiName,
        },
      },
    });

    if (existing) {
      throw new ConflictException(`Custom field with name "${apiName}" already exists for ${dto.entity}`);
    }

    // Get max sort order
    const maxOrder = await this.prisma.customFieldDefinition.aggregate({
      where: { entity: dto.entity },
      _max: { sortOrder: true },
    });

    return this.prisma.customFieldDefinition.create({
      data: {
        name: apiName,
        label: dto.label,
        description: dto.description,
        entity: dto.entity,
        fieldType: dto.fieldType,
        isRequired: dto.isRequired ?? false,
        isUnique: dto.isUnique ?? false,
        defaultValue: dto.defaultValue,
        picklistValues: dto.picklistValues,
        lookupEntity: dto.lookupEntity,
        precision: dto.precision,
        minValue: dto.minValue,
        maxValue: dto.maxValue,
        maxLength: dto.maxLength,
        pattern: dto.pattern,
        sortOrder: (maxOrder._max.sortOrder ?? 0) + 1,
        createdBy: userId,
      },
    });
  }

  async findAll(filters?: {
    entity?: CustomFieldEntity;
    fieldType?: CustomFieldType;
    isActive?: boolean;
  }) {
    const where: any = {};

    if (filters?.entity) {
      where.entity = filters.entity;
    }

    if (filters?.fieldType) {
      where.fieldType = filters.fieldType;
    }

    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    return this.prisma.customFieldDefinition.findMany({
      where,
      orderBy: [
        { entity: 'asc' },
        { sortOrder: 'asc' },
      ],
    });
  }

  async findOne(id: string) {
    const field = await this.prisma.customFieldDefinition.findUnique({
      where: { id },
    });

    if (!field) {
      throw new NotFoundException(`Custom field with ID "${id}" not found`);
    }

    return field;
  }

  async update(id: string, dto: UpdateCustomFieldDto) {
    const field = await this.prisma.customFieldDefinition.findUnique({
      where: { id },
    });

    if (!field) {
      throw new NotFoundException(`Custom field with ID "${id}" not found`);
    }

    // Cannot change type after creation
    if (dto.fieldType && dto.fieldType !== field.fieldType) {
      throw new BadRequestException('Cannot change field type after creation');
    }

    return this.prisma.customFieldDefinition.update({
      where: { id },
      data: {
        label: dto.label,
        description: dto.description,
        isRequired: dto.isRequired,
        isUnique: dto.isUnique,
        isActive: dto.isActive,
        defaultValue: dto.defaultValue,
        picklistValues: dto.picklistValues,
        precision: dto.precision,
        minValue: dto.minValue,
        maxValue: dto.maxValue,
        maxLength: dto.maxLength,
        pattern: dto.pattern,
      },
    });
  }

  async remove(id: string) {
    const field = await this.prisma.customFieldDefinition.findUnique({
      where: { id },
      include: { values: { take: 1 } },
    });

    if (!field) {
      throw new NotFoundException(`Custom field with ID "${id}" not found`);
    }

    // Check if field has values
    if (field.values.length > 0) {
      throw new BadRequestException('Cannot delete field with existing values. Deactivate it instead.');
    }

    return this.prisma.customFieldDefinition.delete({
      where: { id },
    });
  }

  async reorder(fieldIds: string[]) {
    const updates = fieldIds.map((id, index) =>
      this.prisma.customFieldDefinition.update({
        where: { id },
        data: { sortOrder: index + 1 },
      })
    );

    await this.prisma.$transaction(updates);
    return { success: true };
  }

  // Custom Field Values
  async setFieldValue(
    fieldId: string,
    entityType: CustomFieldEntity,
    entityId: string,
    value: any,
  ) {
    const field = await this.prisma.customFieldDefinition.findUnique({
      where: { id: fieldId },
    });

    if (!field) {
      throw new NotFoundException(`Custom field with ID "${fieldId}" not found`);
    }

    if (field.entity !== entityType) {
      throw new BadRequestException(`Field "${field.label}" is not valid for ${entityType}`);
    }

    // Validate value based on field type
    const validatedValue = this.validateAndTransformValue(field, value);

    return this.prisma.customFieldValue.upsert({
      where: {
        fieldId_entityType_entityId: {
          fieldId,
          entityType,
          entityId,
        },
      },
      update: validatedValue,
      create: {
        fieldId,
        entityType,
        entityId,
        ...validatedValue,
      },
    });
  }

  async getFieldValues(entityType: CustomFieldEntity, entityId: string) {
    const values = await this.prisma.customFieldValue.findMany({
      where: {
        entityType,
        entityId,
      },
      include: {
        field: true,
      },
    });

    return values.map(v => ({
      fieldId: v.fieldId,
      fieldName: v.field.name,
      fieldLabel: v.field.label,
      fieldType: v.field.fieldType,
      value: this.extractValue(v),
    }));
  }

  async deleteFieldValue(fieldId: string, entityType: CustomFieldEntity, entityId: string) {
    return this.prisma.customFieldValue.delete({
      where: {
        fieldId_entityType_entityId: {
          fieldId,
          entityType,
          entityId,
        },
      },
    });
  }

  async getStats() {
    const [total, byEntity, byType, activeCount] = await Promise.all([
      this.prisma.customFieldDefinition.count(),
      this.prisma.customFieldDefinition.groupBy({
        by: ['entity'],
        _count: true,
      }),
      this.prisma.customFieldDefinition.groupBy({
        by: ['fieldType'],
        _count: true,
      }),
      this.prisma.customFieldDefinition.count({ where: { isActive: true } }),
    ]);

    return {
      total,
      active: activeCount,
      inactive: total - activeCount,
      byEntity: byEntity.map(e => ({ entity: e.entity, count: e._count })),
      byType: byType.map(t => ({ type: t.fieldType, count: t._count })),
    };
  }

  // Picklist management
  async addPicklistValue(fieldId: string, value: { value: string; label: string }) {
    const field = await this.prisma.customFieldDefinition.findUnique({
      where: { id: fieldId },
    });

    if (!field) {
      throw new NotFoundException(`Custom field with ID "${fieldId}" not found`);
    }

    if (field.fieldType !== 'PICKLIST' && field.fieldType !== 'MULTI_PICKLIST') {
      throw new BadRequestException('Field is not a picklist type');
    }

    const currentValues = (field.picklistValues as any[]) || [];
    const maxOrder = currentValues.reduce((max, v) => Math.max(max, v.sortOrder || 0), 0);

    const newValue = {
      id: `pv_${Date.now()}`,
      value: value.value,
      label: value.label,
      isActive: true,
      sortOrder: maxOrder + 1,
    };

    return this.prisma.customFieldDefinition.update({
      where: { id: fieldId },
      data: {
        picklistValues: [...currentValues, newValue],
      },
    });
  }

  async updatePicklistValue(fieldId: string, valueId: string, updates: { label?: string; isActive?: boolean }) {
    const field = await this.prisma.customFieldDefinition.findUnique({
      where: { id: fieldId },
    });

    if (!field) {
      throw new NotFoundException(`Custom field with ID "${fieldId}" not found`);
    }

    const currentValues = (field.picklistValues as any[]) || [];
    const updatedValues = currentValues.map(v =>
      v.id === valueId ? { ...v, ...updates } : v
    );

    return this.prisma.customFieldDefinition.update({
      where: { id: fieldId },
      data: {
        picklistValues: updatedValues,
      },
    });
  }

  async reorderPicklistValues(fieldId: string, valueIds: string[]) {
    const field = await this.prisma.customFieldDefinition.findUnique({
      where: { id: fieldId },
    });

    if (!field) {
      throw new NotFoundException(`Custom field with ID "${fieldId}" not found`);
    }

    const currentValues = (field.picklistValues as any[]) || [];
    const reorderedValues = valueIds.map((id, index) => {
      const value = currentValues.find(v => v.id === id);
      return value ? { ...value, sortOrder: index + 1 } : null;
    }).filter(Boolean);

    return this.prisma.customFieldDefinition.update({
      where: { id: fieldId },
      data: {
        picklistValues: reorderedValues,
      },
    });
  }

  // Helper methods
  private generateApiName(label: string): string {
    return label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '');
  }

  private validateAndTransformValue(field: any, value: any) {
    const result: any = {};

    switch (field.fieldType) {
      case 'TEXT':
      case 'TEXTAREA':
      case 'EMAIL':
      case 'PHONE':
      case 'URL':
      case 'PICKLIST':
        result.textValue = String(value);
        break;

      case 'NUMBER':
      case 'CURRENCY':
        const num = parseFloat(value);
        if (isNaN(num)) {
          throw new BadRequestException(`Invalid number value for field "${field.label}"`);
        }
        if (field.minValue !== null && num < field.minValue) {
          throw new BadRequestException(`Value must be at least ${field.minValue}`);
        }
        if (field.maxValue !== null && num > field.maxValue) {
          throw new BadRequestException(`Value must be at most ${field.maxValue}`);
        }
        result.numberValue = num;
        break;

      case 'CHECKBOX':
        result.booleanValue = Boolean(value);
        break;

      case 'DATE':
      case 'DATETIME':
        result.dateValue = new Date(value);
        break;

      case 'MULTI_PICKLIST':
      case 'LOOKUP':
        result.jsonValue = value;
        break;

      default:
        result.textValue = String(value);
    }

    return result;
  }

  private extractValue(valueRecord: any) {
    if (valueRecord.textValue !== null) return valueRecord.textValue;
    if (valueRecord.numberValue !== null) return valueRecord.numberValue;
    if (valueRecord.booleanValue !== null) return valueRecord.booleanValue;
    if (valueRecord.dateValue !== null) return valueRecord.dateValue;
    if (valueRecord.jsonValue !== null) return valueRecord.jsonValue;
    return null;
  }
}
