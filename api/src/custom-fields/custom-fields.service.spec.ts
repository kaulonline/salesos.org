import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { CustomFieldsService } from './custom-fields.service';
import { PrismaService } from '../database/prisma.service';

describe('CustomFieldsService', () => {
  let service: CustomFieldsService;

  const mockPrisma = {
    customFieldDefinition: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
      groupBy: jest.fn(),
    },
    customFieldValue: {
      upsert: jest.fn(),
      findMany: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomFieldsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<CustomFieldsService>(CustomFieldsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ===================== create =====================
  describe('create', () => {
    const baseDto = {
      label: 'Customer Tier',
      entity: 'LEAD' as any,
      fieldType: 'TEXT' as any,
    };

    it('should create a custom field with auto-generated API name', async () => {
      mockPrisma.customFieldDefinition.findUnique.mockResolvedValue(null);
      mockPrisma.customFieldDefinition.aggregate.mockResolvedValue({ _max: { sortOrder: 3 } });
      mockPrisma.customFieldDefinition.create.mockResolvedValue({
        id: 'cf-1',
        name: 'customer_tier',
        label: 'Customer Tier',
        entity: 'LEAD',
        fieldType: 'TEXT',
        sortOrder: 4,
        isRequired: false,
        isUnique: false,
        createdBy: 'user-1',
      });

      const result = await service.create('user-1', baseDto as any);

      expect(result).toBeDefined();
      expect(result.name).toBe('customer_tier');
      expect(result.sortOrder).toBe(4);
      expect(mockPrisma.customFieldDefinition.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'customer_tier',
            label: 'Customer Tier',
            entity: 'LEAD',
            fieldType: 'TEXT',
            isRequired: false,
            isUnique: false,
            sortOrder: 4,
            createdBy: 'user-1',
          }),
        }),
      );
    });

    it('should use the provided name instead of auto-generating', async () => {
      mockPrisma.customFieldDefinition.findUnique.mockResolvedValue(null);
      mockPrisma.customFieldDefinition.aggregate.mockResolvedValue({ _max: { sortOrder: 0 } });
      mockPrisma.customFieldDefinition.create.mockResolvedValue({
        id: 'cf-2',
        name: 'my_custom_name',
        label: 'Customer Tier',
        sortOrder: 1,
      });

      await service.create('user-1', { ...baseDto, name: 'my_custom_name' } as any);

      expect(mockPrisma.customFieldDefinition.findUnique).toHaveBeenCalledWith({
        where: { entity_name: { entity: 'LEAD', name: 'my_custom_name' } },
      });
      expect(mockPrisma.customFieldDefinition.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ name: 'my_custom_name' }),
        }),
      );
    });

    it('should throw ConflictException when field name already exists', async () => {
      mockPrisma.customFieldDefinition.findUnique.mockResolvedValue({ id: 'existing-cf' });

      await expect(service.create('user-1', baseDto as any)).rejects.toThrow(ConflictException);
    });

    it('should set sortOrder to 1 when no existing fields', async () => {
      mockPrisma.customFieldDefinition.findUnique.mockResolvedValue(null);
      mockPrisma.customFieldDefinition.aggregate.mockResolvedValue({ _max: { sortOrder: null } });
      mockPrisma.customFieldDefinition.create.mockResolvedValue({ id: 'cf-3', sortOrder: 1 });

      await service.create('user-1', baseDto as any);

      expect(mockPrisma.customFieldDefinition.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ sortOrder: 1 }),
        }),
      );
    });

    it('should pass optional fields through to create', async () => {
      const dto = {
        ...baseDto,
        fieldType: 'NUMBER' as any,
        isRequired: true,
        isUnique: true,
        defaultValue: '0',
        precision: 2,
        minValue: 0,
        maxValue: 100,
        maxLength: 50,
        pattern: '^[0-9]+$',
        description: 'A number field',
        picklistValues: null,
        lookupEntity: null,
      };

      mockPrisma.customFieldDefinition.findUnique.mockResolvedValue(null);
      mockPrisma.customFieldDefinition.aggregate.mockResolvedValue({ _max: { sortOrder: 0 } });
      mockPrisma.customFieldDefinition.create.mockResolvedValue({ id: 'cf-4', ...dto });

      await service.create('user-1', dto as any);

      expect(mockPrisma.customFieldDefinition.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            isRequired: true,
            isUnique: true,
            precision: 2,
            minValue: 0,
            maxValue: 100,
          }),
        }),
      );
    });
  });

  // ===================== findAll =====================
  describe('findAll', () => {
    it('should return all custom fields when no filters provided', async () => {
      const fields = [
        { id: 'cf-1', name: 'field_1', entity: 'LEAD', sortOrder: 1 },
        { id: 'cf-2', name: 'field_2', entity: 'CONTACT', sortOrder: 1 },
      ];
      mockPrisma.customFieldDefinition.findMany.mockResolvedValue(fields);

      const result = await service.findAll();

      expect(result).toEqual(fields);
      expect(mockPrisma.customFieldDefinition.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: [{ entity: 'asc' }, { sortOrder: 'asc' }],
      });
    });

    it('should filter by entity', async () => {
      mockPrisma.customFieldDefinition.findMany.mockResolvedValue([]);

      await service.findAll({ entity: 'LEAD' as any });

      expect(mockPrisma.customFieldDefinition.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { entity: 'LEAD' },
        }),
      );
    });

    it('should filter by fieldType', async () => {
      mockPrisma.customFieldDefinition.findMany.mockResolvedValue([]);

      await service.findAll({ fieldType: 'TEXT' as any });

      expect(mockPrisma.customFieldDefinition.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { fieldType: 'TEXT' },
        }),
      );
    });

    it('should filter by isActive', async () => {
      mockPrisma.customFieldDefinition.findMany.mockResolvedValue([]);

      await service.findAll({ isActive: true });

      expect(mockPrisma.customFieldDefinition.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isActive: true },
        }),
      );
    });

    it('should apply multiple filters simultaneously', async () => {
      mockPrisma.customFieldDefinition.findMany.mockResolvedValue([]);

      await service.findAll({ entity: 'LEAD' as any, fieldType: 'TEXT' as any, isActive: false });

      expect(mockPrisma.customFieldDefinition.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { entity: 'LEAD', fieldType: 'TEXT', isActive: false },
        }),
      );
    });
  });

  // ===================== findOne =====================
  describe('findOne', () => {
    it('should return a custom field by ID', async () => {
      const field = { id: 'cf-1', name: 'test_field', label: 'Test Field' };
      mockPrisma.customFieldDefinition.findUnique.mockResolvedValue(field);

      const result = await service.findOne('cf-1');

      expect(result).toEqual(field);
      expect(mockPrisma.customFieldDefinition.findUnique).toHaveBeenCalledWith({ where: { id: 'cf-1' } });
    });

    it('should throw NotFoundException when field not found', async () => {
      mockPrisma.customFieldDefinition.findUnique.mockResolvedValue(null);

      await expect(service.findOne('cf-missing')).rejects.toThrow(NotFoundException);
    });
  });

  // ===================== update =====================
  describe('update', () => {
    const existingField = {
      id: 'cf-1',
      name: 'field_1',
      label: 'Old Label',
      fieldType: 'TEXT',
      entity: 'LEAD',
    };

    it('should update a custom field', async () => {
      mockPrisma.customFieldDefinition.findUnique.mockResolvedValue(existingField);
      mockPrisma.customFieldDefinition.update.mockResolvedValue({
        ...existingField,
        label: 'New Label',
      });

      const result = await service.update('cf-1', { label: 'New Label' } as any);

      expect(result.label).toBe('New Label');
      expect(mockPrisma.customFieldDefinition.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'cf-1' },
          data: expect.objectContaining({ label: 'New Label' }),
        }),
      );
    });

    it('should throw NotFoundException when field not found', async () => {
      mockPrisma.customFieldDefinition.findUnique.mockResolvedValue(null);

      await expect(service.update('cf-missing', { label: 'X' } as any)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when trying to change field type', async () => {
      mockPrisma.customFieldDefinition.findUnique.mockResolvedValue(existingField);

      await expect(
        service.update('cf-1', { fieldType: 'NUMBER' } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow setting the same field type (no-op)', async () => {
      mockPrisma.customFieldDefinition.findUnique.mockResolvedValue(existingField);
      mockPrisma.customFieldDefinition.update.mockResolvedValue(existingField);

      await expect(
        service.update('cf-1', { fieldType: 'TEXT' } as any),
      ).resolves.toBeDefined();
    });
  });

  // ===================== remove =====================
  describe('remove', () => {
    it('should delete a field with no values', async () => {
      const field = { id: 'cf-1', name: 'field_1', values: [] };
      mockPrisma.customFieldDefinition.findUnique.mockResolvedValue(field);
      mockPrisma.customFieldDefinition.delete.mockResolvedValue(field);

      const result = await service.remove('cf-1');

      expect(result).toEqual(field);
      expect(mockPrisma.customFieldDefinition.delete).toHaveBeenCalledWith({ where: { id: 'cf-1' } });
    });

    it('should throw NotFoundException when field not found', async () => {
      mockPrisma.customFieldDefinition.findUnique.mockResolvedValue(null);

      await expect(service.remove('cf-missing')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when field has existing values', async () => {
      const field = { id: 'cf-1', values: [{ id: 'val-1' }] };
      mockPrisma.customFieldDefinition.findUnique.mockResolvedValue(field);

      await expect(service.remove('cf-1')).rejects.toThrow(BadRequestException);
    });

    it('should include values in findUnique call with take: 1', async () => {
      const field = { id: 'cf-1', values: [] };
      mockPrisma.customFieldDefinition.findUnique.mockResolvedValue(field);
      mockPrisma.customFieldDefinition.delete.mockResolvedValue(field);

      await service.remove('cf-1');

      expect(mockPrisma.customFieldDefinition.findUnique).toHaveBeenCalledWith({
        where: { id: 'cf-1' },
        include: { values: { take: 1 } },
      });
    });
  });

  // ===================== reorder =====================
  describe('reorder', () => {
    it('should reorder fields using a transaction', async () => {
      mockPrisma.$transaction.mockResolvedValue([]);

      const result = await service.reorder(['cf-3', 'cf-1', 'cf-2']);

      expect(result).toEqual({ success: true });
      expect(mockPrisma.$transaction).toHaveBeenCalledWith([
        expect.anything(),
        expect.anything(),
        expect.anything(),
      ]);
    });

    it('should assign sort orders starting from 1', async () => {
      mockPrisma.$transaction.mockResolvedValue([]);

      await service.reorder(['cf-a', 'cf-b']);

      expect(mockPrisma.customFieldDefinition.update).toHaveBeenCalledWith({
        where: { id: 'cf-a' },
        data: { sortOrder: 1 },
      });
      expect(mockPrisma.customFieldDefinition.update).toHaveBeenCalledWith({
        where: { id: 'cf-b' },
        data: { sortOrder: 2 },
      });
    });

    it('should handle empty array', async () => {
      mockPrisma.$transaction.mockResolvedValue([]);

      const result = await service.reorder([]);

      expect(result).toEqual({ success: true });
      expect(mockPrisma.$transaction).toHaveBeenCalledWith([]);
    });
  });

  // ===================== setFieldValue =====================
  describe('setFieldValue', () => {
    const textField = {
      id: 'cf-1',
      fieldType: 'TEXT',
      entity: 'LEAD',
      label: 'Text Field',
      minValue: null,
      maxValue: null,
    };

    it('should upsert a text field value', async () => {
      mockPrisma.customFieldDefinition.findUnique.mockResolvedValue(textField);
      mockPrisma.customFieldValue.upsert.mockResolvedValue({ id: 'val-1', textValue: 'hello' });

      const result = await service.setFieldValue('cf-1', 'LEAD' as any, 'lead-1', 'hello');

      expect(result).toBeDefined();
      expect(mockPrisma.customFieldValue.upsert).toHaveBeenCalledWith({
        where: {
          fieldId_entityType_entityId: {
            fieldId: 'cf-1',
            entityType: 'LEAD',
            entityId: 'lead-1',
          },
        },
        update: { textValue: 'hello' },
        create: {
          fieldId: 'cf-1',
          entityType: 'LEAD',
          entityId: 'lead-1',
          textValue: 'hello',
        },
      });
    });

    it('should throw NotFoundException when field does not exist', async () => {
      mockPrisma.customFieldDefinition.findUnique.mockResolvedValue(null);

      await expect(
        service.setFieldValue('cf-missing', 'LEAD' as any, 'lead-1', 'val'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when entity type does not match', async () => {
      mockPrisma.customFieldDefinition.findUnique.mockResolvedValue(textField);

      await expect(
        service.setFieldValue('cf-1', 'CONTACT' as any, 'contact-1', 'val'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should store number values for NUMBER field type', async () => {
      const numField = { ...textField, fieldType: 'NUMBER', minValue: null, maxValue: null };
      mockPrisma.customFieldDefinition.findUnique.mockResolvedValue(numField);
      mockPrisma.customFieldValue.upsert.mockResolvedValue({ id: 'val-2', numberValue: 42 });

      await service.setFieldValue('cf-1', 'LEAD' as any, 'lead-1', '42');

      expect(mockPrisma.customFieldValue.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: { numberValue: 42 },
        }),
      );
    });

    it('should throw BadRequestException for invalid number value', async () => {
      const numField = { ...textField, fieldType: 'NUMBER', minValue: null, maxValue: null };
      mockPrisma.customFieldDefinition.findUnique.mockResolvedValue(numField);

      await expect(
        service.setFieldValue('cf-1', 'LEAD' as any, 'lead-1', 'not-a-number'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when number is below minValue', async () => {
      const numField = { ...textField, fieldType: 'NUMBER', minValue: 10, maxValue: null };
      mockPrisma.customFieldDefinition.findUnique.mockResolvedValue(numField);

      await expect(
        service.setFieldValue('cf-1', 'LEAD' as any, 'lead-1', '5'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when number exceeds maxValue', async () => {
      const numField = { ...textField, fieldType: 'NUMBER', minValue: null, maxValue: 50 };
      mockPrisma.customFieldDefinition.findUnique.mockResolvedValue(numField);

      await expect(
        service.setFieldValue('cf-1', 'LEAD' as any, 'lead-1', '100'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should store boolean values for CHECKBOX field type', async () => {
      const boolField = { ...textField, fieldType: 'CHECKBOX' };
      mockPrisma.customFieldDefinition.findUnique.mockResolvedValue(boolField);
      mockPrisma.customFieldValue.upsert.mockResolvedValue({ id: 'val-3', booleanValue: true });

      await service.setFieldValue('cf-1', 'LEAD' as any, 'lead-1', true);

      expect(mockPrisma.customFieldValue.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: { booleanValue: true },
        }),
      );
    });

    it('should store date values for DATE field type', async () => {
      const dateField = { ...textField, fieldType: 'DATE' };
      mockPrisma.customFieldDefinition.findUnique.mockResolvedValue(dateField);
      mockPrisma.customFieldValue.upsert.mockResolvedValue({ id: 'val-4' });

      await service.setFieldValue('cf-1', 'LEAD' as any, 'lead-1', '2025-01-01');

      expect(mockPrisma.customFieldValue.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: { dateValue: expect.any(Date) },
        }),
      );
    });

    it('should store json values for MULTI_PICKLIST field type', async () => {
      const multiField = { ...textField, fieldType: 'MULTI_PICKLIST' };
      mockPrisma.customFieldDefinition.findUnique.mockResolvedValue(multiField);
      mockPrisma.customFieldValue.upsert.mockResolvedValue({ id: 'val-5' });

      const jsonVal = ['opt1', 'opt2'];
      await service.setFieldValue('cf-1', 'LEAD' as any, 'lead-1', jsonVal);

      expect(mockPrisma.customFieldValue.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: { jsonValue: jsonVal },
        }),
      );
    });

    it('should store CURRENCY values as numberValue', async () => {
      const currencyField = { ...textField, fieldType: 'CURRENCY', minValue: null, maxValue: null };
      mockPrisma.customFieldDefinition.findUnique.mockResolvedValue(currencyField);
      mockPrisma.customFieldValue.upsert.mockResolvedValue({ id: 'val-6', numberValue: 99.99 });

      await service.setFieldValue('cf-1', 'LEAD' as any, 'lead-1', '99.99');

      expect(mockPrisma.customFieldValue.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: { numberValue: 99.99 },
        }),
      );
    });

    it('should store LOOKUP values as jsonValue', async () => {
      const lookupField = { ...textField, fieldType: 'LOOKUP' };
      mockPrisma.customFieldDefinition.findUnique.mockResolvedValue(lookupField);
      mockPrisma.customFieldValue.upsert.mockResolvedValue({ id: 'val-7' });

      const lookupVal = { id: 'ref-1', name: 'Reference' };
      await service.setFieldValue('cf-1', 'LEAD' as any, 'lead-1', lookupVal);

      expect(mockPrisma.customFieldValue.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: { jsonValue: lookupVal },
        }),
      );
    });
  });

  // ===================== getFieldValues =====================
  describe('getFieldValues', () => {
    it('should return mapped field values for an entity', async () => {
      mockPrisma.customFieldValue.findMany.mockResolvedValue([
        {
          fieldId: 'cf-1',
          field: { name: 'tier', label: 'Tier', fieldType: 'TEXT' },
          textValue: 'Gold',
          numberValue: null,
          booleanValue: null,
          dateValue: null,
          jsonValue: null,
        },
        {
          fieldId: 'cf-2',
          field: { name: 'score', label: 'Score', fieldType: 'NUMBER' },
          textValue: null,
          numberValue: 85,
          booleanValue: null,
          dateValue: null,
          jsonValue: null,
        },
      ]);

      const result = await service.getFieldValues('LEAD' as any, 'lead-1');

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        fieldId: 'cf-1',
        fieldName: 'tier',
        fieldLabel: 'Tier',
        fieldType: 'TEXT',
        value: 'Gold',
      });
      expect(result[1].value).toBe(85);
    });

    it('should return empty array when no values exist', async () => {
      mockPrisma.customFieldValue.findMany.mockResolvedValue([]);

      const result = await service.getFieldValues('LEAD' as any, 'lead-1');

      expect(result).toEqual([]);
    });

    it('should return null value when all value fields are null', async () => {
      mockPrisma.customFieldValue.findMany.mockResolvedValue([
        {
          fieldId: 'cf-1',
          field: { name: 'empty', label: 'Empty', fieldType: 'TEXT' },
          textValue: null,
          numberValue: null,
          booleanValue: null,
          dateValue: null,
          jsonValue: null,
        },
      ]);

      const result = await service.getFieldValues('LEAD' as any, 'lead-1');

      expect(result[0].value).toBeNull();
    });
  });

  // ===================== deleteFieldValue =====================
  describe('deleteFieldValue', () => {
    it('should delete a field value by composite key', async () => {
      mockPrisma.customFieldValue.delete.mockResolvedValue({ id: 'val-1' });

      await service.deleteFieldValue('cf-1', 'LEAD' as any, 'lead-1');

      expect(mockPrisma.customFieldValue.delete).toHaveBeenCalledWith({
        where: {
          fieldId_entityType_entityId: {
            fieldId: 'cf-1',
            entityType: 'LEAD',
            entityId: 'lead-1',
          },
        },
      });
    });
  });

  // ===================== getStats =====================
  describe('getStats', () => {
    it('should return aggregated statistics', async () => {
      mockPrisma.customFieldDefinition.count
        .mockResolvedValueOnce(10)  // total
        .mockResolvedValueOnce(8);  // activeCount
      mockPrisma.customFieldDefinition.groupBy
        .mockResolvedValueOnce([
          { entity: 'LEAD', _count: 5 },
          { entity: 'CONTACT', _count: 5 },
        ])
        .mockResolvedValueOnce([
          { fieldType: 'TEXT', _count: 6 },
          { fieldType: 'NUMBER', _count: 4 },
        ]);

      const result = await service.getStats();

      expect(result).toEqual({
        total: 10,
        active: 8,
        inactive: 2,
        byEntity: [
          { entity: 'LEAD', count: 5 },
          { entity: 'CONTACT', count: 5 },
        ],
        byType: [
          { type: 'TEXT', count: 6 },
          { type: 'NUMBER', count: 4 },
        ],
      });
    });

    it('should handle zero counts', async () => {
      mockPrisma.customFieldDefinition.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);
      mockPrisma.customFieldDefinition.groupBy
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await service.getStats();

      expect(result).toEqual({
        total: 0,
        active: 0,
        inactive: 0,
        byEntity: [],
        byType: [],
      });
    });
  });

  // ===================== addPicklistValue =====================
  describe('addPicklistValue', () => {
    it('should add a picklist value to a PICKLIST field', async () => {
      const field = {
        id: 'cf-1',
        fieldType: 'PICKLIST',
        picklistValues: [
          { id: 'pv_1', value: 'opt1', label: 'Option 1', isActive: true, sortOrder: 1 },
        ],
      };
      mockPrisma.customFieldDefinition.findUnique.mockResolvedValue(field);
      mockPrisma.customFieldDefinition.update.mockResolvedValue({ ...field, picklistValues: [] });

      await service.addPicklistValue('cf-1', { value: 'opt2', label: 'Option 2' });

      expect(mockPrisma.customFieldDefinition.update).toHaveBeenCalledWith({
        where: { id: 'cf-1' },
        data: {
          picklistValues: expect.arrayContaining([
            expect.objectContaining({ value: 'opt1' }),
            expect.objectContaining({ value: 'opt2', label: 'Option 2', isActive: true, sortOrder: 2 }),
          ]),
        },
      });
    });

    it('should add a picklist value to a MULTI_PICKLIST field', async () => {
      const field = { id: 'cf-2', fieldType: 'MULTI_PICKLIST', picklistValues: [] };
      mockPrisma.customFieldDefinition.findUnique.mockResolvedValue(field);
      mockPrisma.customFieldDefinition.update.mockResolvedValue(field);

      await service.addPicklistValue('cf-2', { value: 'v1', label: 'V1' });

      expect(mockPrisma.customFieldDefinition.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException when field not found', async () => {
      mockPrisma.customFieldDefinition.findUnique.mockResolvedValue(null);

      await expect(
        service.addPicklistValue('cf-missing', { value: 'v', label: 'V' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when field is not a picklist type', async () => {
      mockPrisma.customFieldDefinition.findUnique.mockResolvedValue({ id: 'cf-1', fieldType: 'TEXT' });

      await expect(
        service.addPicklistValue('cf-1', { value: 'v', label: 'V' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle null picklistValues gracefully', async () => {
      const field = { id: 'cf-1', fieldType: 'PICKLIST', picklistValues: null };
      mockPrisma.customFieldDefinition.findUnique.mockResolvedValue(field);
      mockPrisma.customFieldDefinition.update.mockResolvedValue(field);

      await service.addPicklistValue('cf-1', { value: 'first', label: 'First' });

      expect(mockPrisma.customFieldDefinition.update).toHaveBeenCalledWith({
        where: { id: 'cf-1' },
        data: {
          picklistValues: [
            expect.objectContaining({ value: 'first', label: 'First', sortOrder: 1 }),
          ],
        },
      });
    });
  });

  // ===================== updatePicklistValue =====================
  describe('updatePicklistValue', () => {
    it('should update a picklist value by ID', async () => {
      const field = {
        id: 'cf-1',
        fieldType: 'PICKLIST',
        picklistValues: [
          { id: 'pv_1', value: 'opt1', label: 'Old Label', isActive: true, sortOrder: 1 },
          { id: 'pv_2', value: 'opt2', label: 'Label 2', isActive: true, sortOrder: 2 },
        ],
      };
      mockPrisma.customFieldDefinition.findUnique.mockResolvedValue(field);
      mockPrisma.customFieldDefinition.update.mockResolvedValue(field);

      await service.updatePicklistValue('cf-1', 'pv_1', { label: 'New Label' });

      expect(mockPrisma.customFieldDefinition.update).toHaveBeenCalledWith({
        where: { id: 'cf-1' },
        data: {
          picklistValues: [
            expect.objectContaining({ id: 'pv_1', label: 'New Label' }),
            expect.objectContaining({ id: 'pv_2', label: 'Label 2' }),
          ],
        },
      });
    });

    it('should throw NotFoundException when field not found', async () => {
      mockPrisma.customFieldDefinition.findUnique.mockResolvedValue(null);

      await expect(
        service.updatePicklistValue('cf-missing', 'pv_1', { label: 'X' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should deactivate a picklist value', async () => {
      const field = {
        id: 'cf-1',
        picklistValues: [{ id: 'pv_1', value: 'v1', isActive: true, sortOrder: 1 }],
      };
      mockPrisma.customFieldDefinition.findUnique.mockResolvedValue(field);
      mockPrisma.customFieldDefinition.update.mockResolvedValue(field);

      await service.updatePicklistValue('cf-1', 'pv_1', { isActive: false });

      expect(mockPrisma.customFieldDefinition.update).toHaveBeenCalledWith({
        where: { id: 'cf-1' },
        data: {
          picklistValues: [expect.objectContaining({ id: 'pv_1', isActive: false })],
        },
      });
    });
  });

  // ===================== reorderPicklistValues =====================
  describe('reorderPicklistValues', () => {
    it('should reorder picklist values', async () => {
      const field = {
        id: 'cf-1',
        picklistValues: [
          { id: 'pv_1', value: 'a', sortOrder: 1 },
          { id: 'pv_2', value: 'b', sortOrder: 2 },
          { id: 'pv_3', value: 'c', sortOrder: 3 },
        ],
      };
      mockPrisma.customFieldDefinition.findUnique.mockResolvedValue(field);
      mockPrisma.customFieldDefinition.update.mockResolvedValue(field);

      await service.reorderPicklistValues('cf-1', ['pv_3', 'pv_1', 'pv_2']);

      expect(mockPrisma.customFieldDefinition.update).toHaveBeenCalledWith({
        where: { id: 'cf-1' },
        data: {
          picklistValues: [
            expect.objectContaining({ id: 'pv_3', sortOrder: 1 }),
            expect.objectContaining({ id: 'pv_1', sortOrder: 2 }),
            expect.objectContaining({ id: 'pv_2', sortOrder: 3 }),
          ],
        },
      });
    });

    it('should throw NotFoundException when field not found', async () => {
      mockPrisma.customFieldDefinition.findUnique.mockResolvedValue(null);

      await expect(
        service.reorderPicklistValues('cf-missing', ['pv_1']),
      ).rejects.toThrow(NotFoundException);
    });

    it('should filter out non-existent value IDs', async () => {
      const field = {
        id: 'cf-1',
        picklistValues: [{ id: 'pv_1', value: 'a', sortOrder: 1 }],
      };
      mockPrisma.customFieldDefinition.findUnique.mockResolvedValue(field);
      mockPrisma.customFieldDefinition.update.mockResolvedValue(field);

      await service.reorderPicklistValues('cf-1', ['pv_1', 'pv_nonexistent']);

      expect(mockPrisma.customFieldDefinition.update).toHaveBeenCalledWith({
        where: { id: 'cf-1' },
        data: {
          picklistValues: [expect.objectContaining({ id: 'pv_1', sortOrder: 1 })],
        },
      });
    });
  });
});
