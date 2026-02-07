import {
  IsOptional,
  IsBoolean,
  IsString,
  IsArray,
  IsNumber,
  IsIn,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO for dashboard widget visibility flags
 */
export class DashboardWidgetsDto {
  @IsOptional()
  @IsBoolean()
  pipelineSummary?: boolean;

  @IsOptional()
  @IsBoolean()
  morningBrief?: boolean;

  @IsOptional()
  @IsBoolean()
  irisRank?: boolean;

  @IsOptional()
  @IsBoolean()
  todaysFocus?: boolean;

  @IsOptional()
  @IsBoolean()
  aiInsights?: boolean;

  @IsOptional()
  @IsBoolean()
  recentActivity?: boolean;

  @IsOptional()
  @IsBoolean()
  crmModeIndicator?: boolean;
}

/**
 * DTO for collapsed sections state
 */
export class CollapsedSectionsDto {
  @IsOptional()
  @IsBoolean()
  pipelineSummary?: boolean;

  @IsOptional()
  @IsBoolean()
  morningBrief?: boolean;

  @IsOptional()
  @IsBoolean()
  irisRank?: boolean;

  @IsOptional()
  @IsBoolean()
  todaysFocus?: boolean;

  @IsOptional()
  @IsBoolean()
  aiInsights?: boolean;

  @IsOptional()
  @IsBoolean()
  recentActivity?: boolean;

  @IsOptional()
  @IsBoolean()
  quickStats?: boolean;
}

/**
 * DTO for phone-specific layout configuration
 */
export class PhoneLayoutDto {
  @IsOptional()
  @IsString()
  @IsIn(['row', 'grid'])
  statsLayout?: 'row' | 'grid';

  @IsOptional()
  @IsString()
  @IsIn(['carousel', 'list'])
  insightsStyle?: 'carousel' | 'list';

  @IsOptional()
  @IsNumber()
  @Min(3)
  @Max(10)
  activityLimit?: number;
}

/**
 * DTO for tablet-specific layout configuration
 */
export class TabletLayoutDto {
  @IsOptional()
  @IsNumber()
  @IsIn([2, 3, 4])
  statsColumns?: 2 | 3 | 4;

  @IsOptional()
  @IsBoolean()
  showDualColumn?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0.3)
  @Max(0.5)
  panelRatio?: number;
}

/**
 * DTO for responsive layout configuration containing phone and tablet settings
 */
export class DashboardLayoutDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => PhoneLayoutDto)
  phone?: PhoneLayoutDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => TabletLayoutDto)
  tablet?: TabletLayoutDto;
}

/**
 * Main DTO for updating dashboard configuration
 */
export class UpdateDashboardConfigDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => DashboardWidgetsDto)
  widgets?: DashboardWidgetsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => CollapsedSectionsDto)
  collapsedSections?: CollapsedSectionsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => DashboardLayoutDto)
  layout?: DashboardLayoutDto;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  widgetOrder?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  quickStats?: string[];

  @IsOptional()
  @IsString()
  dashboardTheme?: string;
}

/**
 * Response type for dashboard configuration
 */
export interface DashboardConfigResponse {
  widgets: {
    pipelineSummary: boolean;
    morningBrief: boolean;
    irisRank: boolean;
    todaysFocus: boolean;
    aiInsights: boolean;
    recentActivity: boolean;
    crmModeIndicator: boolean;
  };
  collapsedSections: {
    pipelineSummary: boolean;
    morningBrief: boolean;
    irisRank: boolean;
    todaysFocus: boolean;
    aiInsights: boolean;
    recentActivity: boolean;
    quickStats: boolean;
  };
  layout: {
    phone: {
      statsLayout: 'row' | 'grid';
      insightsStyle: 'carousel' | 'list';
      activityLimit: number;
    };
    tablet: {
      statsColumns: 2 | 3 | 4;
      showDualColumn: boolean;
      panelRatio: number;
    };
  };
  widgetOrder: string[];
  quickStats: string[];
  dashboardTheme: string;
  updatedAt: Date;
}
