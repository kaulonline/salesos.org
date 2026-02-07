import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { NotificationSchedulerService } from '../notifications/notification-scheduler.service';
import { Contract, ContractStatus, Prisma } from '@prisma/client';

interface CreateContractDto {
  accountId: string;
  quoteId?: string;
  contractName: string;
  startDate?: Date;
  endDate?: Date;
  contractTerm?: number;
  contractValue?: number;
  billingFrequency?: string;
  autoRenew?: boolean;
  description?: string;
  specialTerms?: string;
}

interface UpdateContractDto extends Partial<CreateContractDto> {
  status?: ContractStatus;
}

@Injectable()
export class ContractsService {
  private readonly logger = new Logger(ContractsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationScheduler: NotificationSchedulerService,
  ) {}

  // Create contract
  async createContract(data: CreateContractDto, ownerId: string, organizationId: string): Promise<Contract> {
    this.logger.log(`Creating contract: ${data.contractName}`);

    // Generate contract number
    const count = await this.prisma.contract.count();
    const contractNumber = `C-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;

    // If linked to a quote, verify it's accepted
    if (data.quoteId) {
      const quote = await this.prisma.quote.findUnique({
        where: { id: data.quoteId },
      });

      if (!quote) {
        throw new NotFoundException(`Quote ${data.quoteId} not found`);
      }

      if (quote.status !== 'ACCEPTED') {
        throw new BadRequestException('Can only create contract from accepted quote');
      }

      // Check if contract already exists for this quote
      const existingContract = await this.prisma.contract.findUnique({
        where: { quoteId: data.quoteId },
      });

      if (existingContract) {
        throw new BadRequestException('Contract already exists for this quote');
      }
    }

    // Calculate renewal date if term is provided
    let renewalDate: Date | null = null;
    if (data.startDate && data.contractTerm) {
      const tempDate = new Date(data.startDate);
      tempDate.setMonth(tempDate.getMonth() + data.contractTerm);
      renewalDate = tempDate;
    }

    return this.prisma.contract.create({
      data: {
        contractNumber,
        contractName: data.contractName,
        status: ContractStatus.DRAFT,
        accountId: data.accountId,
        quoteId: data.quoteId,
        ownerId,
        organizationId,
        startDate: data.startDate,
        endDate: data.endDate,
        contractTerm: data.contractTerm,
        contractValue: data.contractValue,
        billingFrequency: data.billingFrequency,
        autoRenew: data.autoRenew || false,
        renewalDate,
        description: data.description,
        specialTerms: data.specialTerms,
      },
      include: {
        account: true,
        quote: true,
        owner: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  // Get contract by ID (with ownership verification)
  async getContract(id: string, userId: string, isAdmin: boolean, organizationId: string): Promise<any> {
    const where: any = { id };
    if (!isAdmin) {
      where.ownerId = userId;
    }
    where.organizationId = organizationId;
    const contract = await this.prisma.contract.findFirst({
      where,
      include: {
        account: true,
        quote: {
          include: {
            lineItems: true,
          },
        },
        owner: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!contract) {
      throw new NotFoundException(`Contract ${id} not found`);
    }

    return contract;
  }

  // List contracts
  async listContracts(filters: {
    status?: ContractStatus;
    accountId?: string;
    ownerId?: string;
    renewalDue?: boolean;
  } | undefined, isAdmin: boolean, organizationId: string): Promise<Contract[]> {
    const where: Prisma.ContractWhereInput = {};

    where.organizationId = organizationId;

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.accountId) {
      where.accountId = filters.accountId;
    }

    if (filters?.ownerId && !isAdmin) {
      where.ownerId = filters.ownerId;
    }

    // Contracts due for renewal in next 60 days
    if (filters?.renewalDue) {
      const now = new Date();
      const sixtyDaysFromNow = new Date();
      sixtyDaysFromNow.setDate(now.getDate() + 60);

      where.renewalDate = {
        gte: now,
        lte: sixtyDaysFromNow,
      };
      where.status = ContractStatus.ACTIVATED;
    }

    return this.prisma.contract.findMany({
      where,
      include: {
        account: {
          select: { id: true, name: true },
        },
        owner: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Update contract (with ownership verification)
  async updateContract(id: string, userId: string, data: UpdateContractDto, isAdmin: boolean, organizationId: string): Promise<Contract> {
    const where: any = { id };
    if (!isAdmin) {
      where.ownerId = userId;
    }
    where.organizationId = organizationId;
    const contract = await this.prisma.contract.findFirst({ where });

    if (!contract) {
      throw new NotFoundException(`Contract ${id} not found`);
    }

    // Calculate renewal date if term changes
    let renewalDate = contract.renewalDate;
    if (data.startDate || data.contractTerm) {
      const startDate = data.startDate || contract.startDate;
      const term = data.contractTerm ?? contract.contractTerm;

      if (startDate && term) {
        renewalDate = new Date(startDate);
        renewalDate.setMonth(renewalDate.getMonth() + term);
      }
    }

    return this.prisma.contract.update({
      where: { id },
      data: {
        ...data,
        renewalDate,
      },
      include: {
        account: true,
        quote: true,
        owner: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  // Submit contract for review
  async submitForReview(id: string, userId: string, isAdmin: boolean, organizationId: string): Promise<Contract> {
    const where: any = { id };
    if (!isAdmin) {
      where.ownerId = userId;
    }
    where.organizationId = organizationId;
    const contract = await this.prisma.contract.findFirst({ where });

    if (!contract) {
      throw new NotFoundException(`Contract ${id} not found`);
    }

    if (contract.status !== ContractStatus.DRAFT) {
      throw new BadRequestException('Only draft contracts can be submitted for review');
    }

    return this.prisma.contract.update({
      where: { id },
      data: {
        status: ContractStatus.IN_REVIEW,
      },
    });
  }

  // Approve contract
  async approveContract(id: string, userId: string, isAdmin: boolean, organizationId: string): Promise<Contract> {
    const where: any = { id };
    if (!isAdmin) {
      where.ownerId = userId;
    }
    where.organizationId = organizationId;
    const contract = await this.prisma.contract.findFirst({ where });

    if (!contract) {
      throw new NotFoundException(`Contract ${id} not found`);
    }

    if (contract.status !== ContractStatus.IN_REVIEW) {
      throw new BadRequestException('Only contracts in review can be approved');
    }

    return this.prisma.contract.update({
      where: { id },
      data: {
        status: ContractStatus.APPROVED,
      },
    });
  }

  // Activate contract (with ownership verification)
  async activateContract(id: string, userId: string, isAdmin: boolean, organizationId: string): Promise<Contract> {
    const where: any = { id };
    if (!isAdmin) {
      where.ownerId = userId;
    }
    where.organizationId = organizationId;
    const contract = await this.prisma.contract.findFirst({
      where,
      include: { account: { select: { name: true } } },
    });

    if (!contract) {
      throw new NotFoundException(`Contract ${id} not found`);
    }

    if (contract.status !== ContractStatus.APPROVED) {
      throw new BadRequestException('Only approved contracts can be activated');
    }

    // Calculate renewal reminder date (30 days before renewal)
    let renewalNoticeDate: Date | null = null;
    if (contract.renewalDate) {
      const tempDate = new Date(contract.renewalDate);
      tempDate.setDate(tempDate.getDate() - 30);
      renewalNoticeDate = tempDate;
    }

    const updated = await this.prisma.contract.update({
      where: { id },
      data: {
        status: ContractStatus.ACTIVATED,
        activatedDate: new Date(),
        renewalNoticeDate,
      },
    });

    // Send Contract Activated notification to the contract owner
    const value = contract.contractValue ? `$${contract.contractValue.toLocaleString()}` : 'N/A';
    this.notificationScheduler.sendSystemNotification(
      contract.ownerId,
      '📝 Contract Activated',
      `"${contract.contractName}" (${value}) is now active`,
      {
        type: 'DEAL_UPDATE',
        priority: 'HIGH',
        action: 'VIEW_CONTRACT',
        actionData: {
          contractId: id,
          contractNumber: contract.contractNumber,
          accountId: contract.accountId,
          accountName: (contract as any).account?.name,
          contractValue: contract.contractValue,
          renewalDate: contract.renewalDate?.toISOString(),
        },
      },
    ).catch((err) => this.logger.error(`Failed to send Contract Activated notification: ${err.message}`));

    return updated;
  }

  // Terminate contract (with ownership verification)
  async terminateContract(id: string, userId: string, reason: string | undefined, isAdmin: boolean, organizationId: string): Promise<Contract> {
    const where: any = { id };
    if (!isAdmin) {
      where.ownerId = userId;
    }
    where.organizationId = organizationId;
    const contract = await this.prisma.contract.findFirst({ where });

    if (!contract) {
      throw new NotFoundException(`Contract ${id} not found`);
    }

    if (contract.status !== ContractStatus.ACTIVATED) {
      throw new BadRequestException('Only activated contracts can be terminated');
    }

    return this.prisma.contract.update({
      where: { id },
      data: {
        status: ContractStatus.TERMINATED,
        terminatedDate: new Date(),
        terminationReason: reason,
      },
    });
  }

  // Renew contract (with ownership verification)
  async renewContract(id: string, userId: string, isAdmin: boolean, organizationId: string): Promise<Contract> {
    const oldContract = await this.getContract(id, userId, isAdmin, organizationId);

    if (oldContract.status !== ContractStatus.ACTIVATED) {
      throw new BadRequestException('Only activated contracts can be renewed');
    }

    // Create new contract based on old one
    const newStartDate = oldContract.endDate || new Date();
    const newEndDate = new Date(newStartDate);
    if (oldContract.contractTerm) {
      newEndDate.setMonth(newEndDate.getMonth() + oldContract.contractTerm);
    }

    const renewalDate = new Date(newEndDate);
    if (oldContract.contractTerm) {
      renewalDate.setMonth(renewalDate.getMonth() + oldContract.contractTerm);
    }

    // Generate new contract number
    const count = await this.prisma.contract.count();
    const contractNumber = `C-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;

    const newContract = await this.prisma.contract.create({
      data: {
        contractNumber,
        contractName: `${oldContract.contractName} (Renewal)`,
        status: ContractStatus.ACTIVATED,
        accountId: oldContract.accountId,
        ownerId: oldContract.ownerId,
        organizationId,
        startDate: newStartDate,
        endDate: newEndDate,
        contractTerm: oldContract.contractTerm,
        contractValue: oldContract.contractValue,
        billingFrequency: oldContract.billingFrequency,
        autoRenew: oldContract.autoRenew,
        renewalDate,
        activatedDate: new Date(),
        description: oldContract.description,
        specialTerms: oldContract.specialTerms,
      },
    });

    // Mark old contract as expired
    await this.prisma.contract.update({
      where: { id },
      data: {
        status: ContractStatus.EXPIRED,
      },
    });

    this.logger.log(`Renewed contract ${id} as new contract ${newContract.id}`);

    return newContract;
  }

  // Get contract statistics
  async getContractStats(ownerId: string | undefined, isAdmin: boolean, organizationId: string): Promise<any> {
    const where: Prisma.ContractWhereInput = (ownerId && !isAdmin) ? { ownerId } : {};

    where.organizationId = organizationId;

    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(now.getDate() + 30);

    const [total, byStatus, totalValue, activeValue, renewalsDue] = await Promise.all([
      this.prisma.contract.count({ where }),
      this.prisma.contract.groupBy({
        by: ['status'],
        where,
        _count: true,
      }),
      this.prisma.contract.aggregate({
        where,
        _sum: { contractValue: true },
      }),
      this.prisma.contract.aggregate({
        where: { ...where, status: ContractStatus.ACTIVATED },
        _sum: { contractValue: true },
      }),
      this.prisma.contract.count({
        where: {
          ...where,
          status: ContractStatus.ACTIVATED,
          renewalDate: {
            gte: now,
            lte: thirtyDaysFromNow,
          },
        },
      }),
    ]);

    return {
      total,
      byStatus,
      totalValue: totalValue._sum.contractValue || 0,
      activeValue: activeValue._sum.contractValue || 0,
      renewalsDueNext30Days: renewalsDue,
    };
  }
}
