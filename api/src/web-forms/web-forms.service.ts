import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateWebFormDto } from './dto/create-web-form.dto';
import { UpdateWebFormDto } from './dto/update-web-form.dto';
import { SubmitWebFormDto } from './dto/submit-web-form.dto';
import { WebFormSubmissionStatus } from '@prisma/client';
import * as crypto from 'crypto';

@Injectable()
export class WebFormsService {
  private readonly logger = new Logger(WebFormsService.name);

  constructor(private prisma: PrismaService) {}

  async create(createdBy: string, dto: CreateWebFormDto) {
    const slug = this.generateSlug(dto.name);

    return this.prisma.webForm.create({
      data: {
        name: dto.name,
        description: dto.description,
        slug,
        fields: (dto.fields || []) as any, // Cast to JSON for Prisma
        settings: (dto.settings || {}) as any,
        styling: (dto.styling || {}) as any,
        successRedirectUrl: dto.redirectUrl,
        successMessage: dto.thankYouMessage ?? 'Thank you for your submission!',
        assignmentRuleId: dto.assignmentRuleId,
        isActive: dto.isActive ?? true,
        createdBy,
      },
    });
  }

  async findAll(filters?: { isActive?: boolean }) {
    return this.prisma.webForm.findMany({
      where: {
        isActive: filters?.isActive,
      },
      include: {
        _count: {
          select: { submissions: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const form = await this.prisma.webForm.findUnique({
      where: { id },
      include: {
        _count: {
          select: { submissions: true },
        },
      },
    });

    if (!form) {
      throw new NotFoundException('Web form not found');
    }

    return form;
  }

  async findBySlug(slug: string) {
    const form = await this.prisma.webForm.findUnique({
      where: { slug },
    });

    if (!form) {
      throw new NotFoundException('Web form not found');
    }

    if (!form.isActive) {
      throw new BadRequestException('This form is not accepting submissions');
    }

    return {
      id: form.id,
      name: form.name,
      description: form.description,
      fields: form.fields,
      styling: form.styling,
      settings: form.settings,
    };
  }

  async update(id: string, dto: UpdateWebFormDto) {
    const form = await this.prisma.webForm.findUnique({
      where: { id },
    });

    if (!form) {
      throw new NotFoundException('Web form not found');
    }

    return this.prisma.webForm.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        fields: dto.fields as any, // Cast to JSON for Prisma
        settings: dto.settings as any,
        styling: dto.styling as any,
        successRedirectUrl: dto.redirectUrl,
        successMessage: dto.thankYouMessage,
        assignmentRuleId: dto.assignmentRuleId,
        isActive: dto.isActive,
      },
    });
  }

  async remove(id: string) {
    const form = await this.prisma.webForm.findUnique({
      where: { id },
    });

    if (!form) {
      throw new NotFoundException('Web form not found');
    }

    await this.prisma.webForm.delete({ where: { id } });
    return { success: true };
  }

  async submit(slug: string, dto: SubmitWebFormDto, metadata: {
    ipAddress?: string;
    userAgent?: string;
    referrer?: string;
  }) {
    const form = await this.prisma.webForm.findUnique({
      where: { slug },
    });

    if (!form) {
      throw new NotFoundException('Web form not found');
    }

    if (!form.isActive) {
      throw new BadRequestException('This form is not accepting submissions');
    }

    const fields = form.fields as Array<{ name: string; required?: boolean; type: string }>;
    for (const field of fields) {
      if (field.required && !dto.data[field.name]) {
        throw new BadRequestException(`Field "${field.name}" is required`);
      }
    }

    const submission = await this.prisma.webFormSubmission.create({
      data: {
        formId: form.id,
        data: dto.data,
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
        referrer: metadata.referrer,
        status: 'PENDING',
      },
    });

    await this.prisma.webForm.update({
      where: { id: form.id },
      data: {
        submissionCount: { increment: 1 },
        lastSubmissionAt: new Date(),
      },
    });

    this.processSubmission(submission.id, form).catch(err => {
      // Log error without exposing submission data
      this.logger.error(`Error processing form submission ${submission.id}`, err instanceof Error ? err.message : 'Unknown error');
    });

    return {
      success: true,
      submissionId: submission.id,
      message: form.successMessage,
      redirectUrl: form.successRedirectUrl,
    };
  }

  private async processSubmission(submissionId: string, form: any) {
    try {
      const submission = await this.prisma.webFormSubmission.findUnique({
        where: { id: submissionId },
      });

      if (!submission) return;

      const data = submission.data as Record<string, any>;

      const lead = await this.prisma.lead.create({
        data: {
          firstName: data.firstName || data.first_name || '',
          lastName: data.lastName || data.last_name || '',
          email: data.email || null,
          phone: data.phone || '',
          company: data.company || '',
          title: data.title || data.jobTitle || '',
          leadSource: 'WEB',
          status: 'NEW',
          ownerId: form.defaultOwnerId || '',
        },
      });

      await this.prisma.webFormSubmission.update({
        where: { id: submissionId },
        data: {
          status: 'PROCESSED',
          createdLeadId: lead.id,
          processedAt: new Date(),
        },
      });

    } catch (error) {
      await this.prisma.webFormSubmission.update({
        where: { id: submissionId },
        data: {
          status: 'FAILED',
          errorMessage: error.message,
          processedAt: new Date(),
        },
      });
      throw error;
    }
  }

  async getSubmissions(formId: string, filters?: {
    status?: WebFormSubmissionStatus;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }) {
    const form = await this.prisma.webForm.findUnique({
      where: { id: formId },
    });

    if (!form) {
      throw new NotFoundException('Web form not found');
    }

    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = { formId };
    if (filters?.status) where.status = filters.status;
    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = filters.startDate;
      if (filters.endDate) where.createdAt.lte = filters.endDate;
    }

    const [submissions, total] = await Promise.all([
      this.prisma.webFormSubmission.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.webFormSubmission.count({ where }),
    ]);

    return {
      submissions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getSubmission(formId: string, submissionId: string) {
    const submission = await this.prisma.webFormSubmission.findFirst({
      where: { id: submissionId, formId },
    });

    if (!submission) {
      throw new NotFoundException('Submission not found');
    }

    return submission;
  }

  async deleteSubmission(formId: string, submissionId: string) {
    const submission = await this.prisma.webFormSubmission.findFirst({
      where: { id: submissionId, formId },
    });

    if (!submission) {
      throw new NotFoundException('Submission not found');
    }

    await this.prisma.webFormSubmission.delete({
      where: { id: submissionId },
    });

    return { success: true };
  }

  async getEmbedCode(id: string, baseUrl: string) {
    const form = await this.prisma.webForm.findUnique({
      where: { id },
    });

    if (!form) {
      throw new NotFoundException('Web form not found');
    }

    const iframeCode = `<iframe src="${baseUrl}/forms/embed/${form.slug}" width="100%" height="500" frameborder="0"></iframe>`;

    const scriptCode = `<div id="salesos-form-${form.slug}"></div>
<script src="${baseUrl}/embed/form-widget.js" data-form-slug="${form.slug}"></script>`;

    const directUrl = `${baseUrl}/forms/${form.slug}`;

    return {
      slug: form.slug,
      iframe: iframeCode,
      script: scriptCode,
      directUrl,
    };
  }

  async regenerateSlug(id: string) {
    const form = await this.prisma.webForm.findUnique({
      where: { id },
    });

    if (!form) {
      throw new NotFoundException('Web form not found');
    }

    const newSlug = this.generateSlug(form.name);

    return this.prisma.webForm.update({
      where: { id },
      data: { slug: newSlug },
    });
  }

  async getStats(formId?: string) {
    if (formId) {
      const [total, byStatus, recent] = await Promise.all([
        this.prisma.webFormSubmission.count({ where: { formId } }),
        this.prisma.webFormSubmission.groupBy({
          by: ['status'],
          where: { formId },
          _count: true,
        }),
        this.prisma.webFormSubmission.count({
          where: {
            formId,
            createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          },
        }),
      ]);

      return {
        total,
        byStatus: byStatus.reduce((acc, item) => {
          acc[item.status] = item._count;
          return acc;
        }, {} as Record<string, number>),
        lastWeek: recent,
      };
    }

    const [totalForms, activeForms, totalSubmissions, recentSubmissions] = await Promise.all([
      this.prisma.webForm.count(),
      this.prisma.webForm.count({ where: { isActive: true } }),
      this.prisma.webFormSubmission.count(),
      this.prisma.webFormSubmission.count({
        where: {
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      }),
    ]);

    return {
      forms: {
        total: totalForms,
        active: activeForms,
      },
      submissions: {
        total: totalSubmissions,
        lastWeek: recentSubmissions,
      },
    };
  }

  async clone(id: string, name: string, createdBy: string) {
    const form = await this.prisma.webForm.findUnique({
      where: { id },
    });

    if (!form) {
      throw new NotFoundException('Web form not found');
    }

    return this.prisma.webForm.create({
      data: {
        name,
        description: form.description,
        slug: this.generateSlug(name),
        fields: form.fields || [],
        settings: form.settings || {},
        styling: form.styling || {},
        successRedirectUrl: form.successRedirectUrl,
        successMessage: form.successMessage,
        assignmentRuleId: form.assignmentRuleId,
        isActive: false,
        createdBy,
      },
    });
  }

  private generateSlug(name: string): string {
    const baseSlug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    const randomSuffix = crypto.randomBytes(4).toString('hex');
    return `${baseSlug}-${randomSuffix}`;
  }
}
