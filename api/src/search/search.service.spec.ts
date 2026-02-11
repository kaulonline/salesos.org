import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SearchService } from './search.service';

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('SearchService', () => {
  let service: SearchService;

  const mockSearchResponse = {
    kind: 'customsearch#search',
    url: { type: 'application/json', template: '' },
    queries: {
      request: [{ totalResults: '100', count: 10, startIndex: 1 }],
    },
    context: { title: 'Test Search' },
    searchInformation: {
      searchTime: 0.25,
      formattedSearchTime: '0.25',
      totalResults: '100',
      formattedTotalResults: '100',
    },
    items: [
      {
        title: 'Acme Corp - About Us',
        link: 'https://acme.com/about',
        snippet: 'Acme Corp is a leading SaaS company...',
        displayLink: 'acme.com',
        pagemap: {
          metatags: [{ 'og:description': 'Acme Corp is a technology company' }],
        },
      },
      {
        title: 'Acme on LinkedIn',
        link: 'https://linkedin.com/company/acme',
        snippet: 'Acme Corp on LinkedIn...',
        displayLink: 'linkedin.com',
      },
    ],
  };

  describe('when enabled (API key and engine ID configured)', () => {
    beforeEach(async () => {
      jest.clearAllMocks();

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          SearchService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((key: string, defaultValue?: string) => {
                if (key === 'GOOGLE_SEARCH_API_KEY') return 'test-api-key';
                if (key === 'GOOGLE_SEARCH_ENGINE_ID') return 'test-engine-id';
                return defaultValue || '';
              }),
            },
          },
        ],
      }).compile();

      service = module.get<SearchService>(SearchService);
    });

    describe('isEnabled', () => {
      it('should return true when configured', () => {
        expect(service.isEnabled()).toBe(true);
      });
    });

    describe('search', () => {
      it('should perform a Google search and return results', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue(mockSearchResponse),
        });

        const result = await service.search('test query');

        expect(result).toEqual(mockSearchResponse);
        expect(mockFetch).toHaveBeenCalledTimes(1);
        const fetchUrl = mockFetch.mock.calls[0][0] as string;
        expect(fetchUrl).toContain('https://www.googleapis.com/customsearch/v1');
        expect(fetchUrl).toContain('q=test+query');
        expect(fetchUrl).toContain('key=test-api-key');
        expect(fetchUrl).toContain('cx=test-engine-id');
      });

      it('should pass optional parameters', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue(mockSearchResponse),
        });

        await service.search('test query', {
          num: 5,
          start: 11,
          siteSearch: 'example.com',
          dateRestrict: 'd7',
          exactTerms: 'exact phrase',
          excludeTerms: 'excluded',
        });

        const fetchUrl = mockFetch.mock.calls[0][0] as string;
        expect(fetchUrl).toContain('num=5');
        expect(fetchUrl).toContain('start=11');
        expect(fetchUrl).toContain('siteSearch=example.com');
        expect(fetchUrl).toContain('dateRestrict=d7');
        expect(fetchUrl).toContain('exactTerms=exact+phrase');
        expect(fetchUrl).toContain('excludeTerms=excluded');
      });

      it('should throw HttpException on API error response', async () => {
        mockFetch.mockResolvedValue({
          ok: false,
          status: 403,
          statusText: 'Forbidden',
          text: jest.fn().mockResolvedValue('Rate limit exceeded'),
        });

        await expect(service.search('test')).rejects.toThrow(HttpException);

        try {
          await service.search('test');
          fail('Expected HttpException');
        } catch (e) {
          expect((e as HttpException).getStatus()).toBe(HttpStatus.BAD_GATEWAY);
        }
      });

      it('should throw HttpException on network error', async () => {
        mockFetch.mockRejectedValueOnce(new Error('Network failure'));

        await expect(service.search('test')).rejects.toThrow(HttpException);
      });
    });

    describe('researchCompany', () => {
      it('should research a company by domain URL', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue(mockSearchResponse),
        });

        const result = await service.researchCompany('https://acme.com');

        expect(result.query).toContain('acme.com');
        expect(result.searchResults).toHaveLength(2);
        expect(result.totalResults).toBe('100');
        expect(result.companyInfo).toBeDefined();
        expect(result.companyInfo?.name).toBe('Acme');
        expect(result.companyInfo?.website).toBe('https://acme.com');
      });

      it('should research a company by name', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue(mockSearchResponse),
        });

        const result = await service.researchCompany('Acme Corp');

        expect(result.query).toContain('Acme Corp');
        expect(result.searchResults).toHaveLength(2);
      });

      it('should extract social links from search results', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue(mockSearchResponse),
        });

        const result = await service.researchCompany('https://acme.com');

        expect(result.companyInfo?.socialLinks).toBeDefined();
        expect(result.companyInfo?.socialLinks).toContain('https://linkedin.com/company/acme');
      });

      it('should handle domain without protocol', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue(mockSearchResponse),
        });

        const result = await service.researchCompany('acme.com');

        expect(result.companyInfo?.website).toBe('https://acme.com');
      });
    });

    describe('searchCompanyNews', () => {
      it('should search for company news with date restriction', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue(mockSearchResponse),
        });

        const result = await service.searchCompanyNews('Acme Corp', 30);

        expect(result.query).toContain('Acme Corp');
        expect(result.query).toContain('news announcement');
        expect(result.searchResults).toHaveLength(2);

        const fetchUrl = mockFetch.mock.calls[0][0] as string;
        expect(fetchUrl).toContain('dateRestrict=d30');
      });

      it('should default to 30 days', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue(mockSearchResponse),
        });

        await service.searchCompanyNews('Acme Corp');

        const fetchUrl = mockFetch.mock.calls[0][0] as string;
        expect(fetchUrl).toContain('dateRestrict=d30');
      });
    });

    describe('searchCompetitors', () => {
      it('should search for competitors', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue(mockSearchResponse),
        });

        const result = await service.searchCompetitors('Acme Corp');

        expect(result.query).toContain('Acme Corp');
        expect(result.query).toContain('competitors alternatives');
      });

      it('should include industry in query when provided', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue(mockSearchResponse),
        });

        const result = await service.searchCompetitors('Acme Corp', 'SaaS');

        expect(result.query).toContain('SaaS');
      });
    });

    describe('searchLeadership', () => {
      it('should search for company leadership', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue(mockSearchResponse),
        });

        const result = await service.searchLeadership('Acme Corp');

        expect(result.query).toContain('Acme Corp');
        expect(result.query).toContain('CEO CTO leadership');
      });
    });

    describe('searchJobPostings', () => {
      it('should search for job postings with date restriction', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue(mockSearchResponse),
        });

        const result = await service.searchJobPostings('Acme Corp');

        expect(result.query).toContain('Acme Corp');
        expect(result.query).toContain('careers jobs hiring');

        const fetchUrl = mockFetch.mock.calls[0][0] as string;
        expect(fetchUrl).toContain('dateRestrict=d30');
      });
    });

    describe('webSearch', () => {
      it('should perform a generic web search', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue(mockSearchResponse),
        });

        const result = await service.webSearch('latest AI trends 2025');

        expect(result.query).toBe('latest AI trends 2025');
        expect(result.searchResults).toHaveLength(2);
        expect(result.totalResults).toBe('100');
      });

      it('should handle empty search results', async () => {
        const emptyResponse = {
          ...mockSearchResponse,
          items: undefined,
          searchInformation: {
            ...mockSearchResponse.searchInformation,
            totalResults: '0',
          },
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue(emptyResponse),
        });

        const result = await service.webSearch('obscure query no results');

        expect(result.searchResults).toEqual([]);
        expect(result.totalResults).toBe('0');
      });
    });
  });

  describe('when disabled (missing API key or engine ID)', () => {
    beforeEach(async () => {
      jest.clearAllMocks();

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          SearchService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((_key: string, defaultValue?: string) => {
                return defaultValue || '';
              }),
            },
          },
        ],
      }).compile();

      service = module.get<SearchService>(SearchService);
    });

    describe('isEnabled', () => {
      it('should return false when not configured', () => {
        expect(service.isEnabled()).toBe(false);
      });
    });

    describe('search', () => {
      it('should throw HttpException SERVICE_UNAVAILABLE when disabled', async () => {
        await expect(service.search('test')).rejects.toThrow(HttpException);
        try {
          await service.search('test');
        } catch (e) {
          expect((e as HttpException).getStatus()).toBe(HttpStatus.SERVICE_UNAVAILABLE);
        }
      });
    });
  });
});
