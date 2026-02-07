import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import {
  BaseIntegrationService,
  ConnectionTestResult,
  IntegrationCredentials,
} from '../base/base-integration.service';
import axios from 'axios';

@Injectable()
export class SegmentService extends BaseIntegrationService {
  protected readonly provider = 'segment';
  protected readonly displayName = 'Segment';
  protected readonly logger = new Logger(SegmentService.name);

  constructor(
    protected readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    super(prisma);
  }

  async testConnection(): Promise<ConnectionTestResult> {
    const credentials = await this.getCredentials();
    if (!credentials?.writeKey) {
      return { success: false, message: 'No write key configured' };
    }

    // Segment doesn't have a test endpoint, but we can validate the key format
    if (credentials.writeKey.length < 10) {
      return { success: false, message: 'Invalid write key format' };
    }

    return {
      success: true,
      message: 'Segment configured',
      details: { writeKeyConfigured: true },
    };
  }

  async saveCredentials(credentials: IntegrationCredentials): Promise<void> {
    await super.saveCredentials(credentials);
  }

  async track(event: {
    userId?: string;
    anonymousId?: string;
    event: string;
    properties?: Record<string, any>;
    context?: Record<string, any>;
  }): Promise<any> {
    const credentials = await this.getCredentials();
    if (!credentials?.writeKey) throw new Error('Segment not connected');

    const response = await axios.post(
      'https://api.segment.io/v1/track',
      {
        userId: event.userId,
        anonymousId: event.anonymousId,
        event: event.event,
        properties: event.properties || {},
        context: event.context || {},
        timestamp: new Date().toISOString(),
      },
      {
        auth: { username: credentials.writeKey, password: '' },
        headers: { 'Content-Type': 'application/json' },
      },
    );

    return response.data;
  }

  async identify(data: {
    userId: string;
    traits?: Record<string, any>;
    context?: Record<string, any>;
  }): Promise<any> {
    const credentials = await this.getCredentials();
    if (!credentials?.writeKey) throw new Error('Segment not connected');

    const response = await axios.post(
      'https://api.segment.io/v1/identify',
      {
        userId: data.userId,
        traits: data.traits || {},
        context: data.context || {},
        timestamp: new Date().toISOString(),
      },
      {
        auth: { username: credentials.writeKey, password: '' },
        headers: { 'Content-Type': 'application/json' },
      },
    );

    return response.data;
  }

  async page(data: {
    userId?: string;
    anonymousId?: string;
    name?: string;
    properties?: Record<string, any>;
  }): Promise<any> {
    const credentials = await this.getCredentials();
    if (!credentials?.writeKey) throw new Error('Segment not connected');

    const response = await axios.post(
      'https://api.segment.io/v1/page',
      {
        userId: data.userId,
        anonymousId: data.anonymousId,
        name: data.name,
        properties: data.properties || {},
        timestamp: new Date().toISOString(),
      },
      {
        auth: { username: credentials.writeKey, password: '' },
        headers: { 'Content-Type': 'application/json' },
      },
    );

    return response.data;
  }

  async group(data: {
    userId: string;
    groupId: string;
    traits?: Record<string, any>;
  }): Promise<any> {
    const credentials = await this.getCredentials();
    if (!credentials?.writeKey) throw new Error('Segment not connected');

    const response = await axios.post(
      'https://api.segment.io/v1/group',
      {
        userId: data.userId,
        groupId: data.groupId,
        traits: data.traits || {},
        timestamp: new Date().toISOString(),
      },
      {
        auth: { username: credentials.writeKey, password: '' },
        headers: { 'Content-Type': 'application/json' },
      },
    );

    return response.data;
  }
}
