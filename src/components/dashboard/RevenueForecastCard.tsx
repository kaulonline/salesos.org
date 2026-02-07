import React from 'react';
import { TrendingUp } from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import { formatCurrency, ForecastData } from './types';

interface RevenueForecastCardProps {
  forecast: ForecastData | null;
  totalPipeline: number;
}

export const RevenueForecastCard: React.FC<RevenueForecastCardProps> = ({
  forecast,
  totalPipeline,
}) => {
  return (
    <Card className="mt-6 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-semibold text-[#1A1A1A]">Revenue Forecast</h3>
          <p className="text-sm text-[#666]">{forecast?.quarterName || 'Current Quarter'} Projection</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm">
            <span className="w-3 h-3 rounded-full bg-[#1A1A1A]"></span>
            <span className="text-[#666]">Committed</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="w-3 h-3 rounded-full bg-[#EAD07D]"></span>
            <span className="text-[#666]">Best Case</span>
          </div>
        </div>
      </div>

      <div className="flex items-baseline gap-4 mb-8">
        <span className="text-5xl font-light text-[#1A1A1A] tabular-nums min-w-[200px]">${(forecast?.quarterBestCase || totalPipeline).toLocaleString()}</span>
        <span className="text-sm text-[#666]">projected revenue</span>
        {(forecast?.quarterCommit ?? 0) > 0 && (
          <span className="px-4 py-2 bg-[#F0EBD8] rounded-full text-sm font-medium text-[#1A1A1A]">
            {formatCurrency(forecast?.quarterCommit ?? 0)} committed
          </span>
        )}
      </div>

      {/* Forecast Chart */}
      {forecast?.monthly && forecast.monthly.length > 0 ? (
        <div className="flex items-end justify-between h-40 gap-6">
          {(() => {
            const maxValue = Math.max(
              ...forecast.monthly.map(m => Math.max(m.mostLikely || 0, m.commit || 0, m.bestCase || 0)),
              1
            );
            return forecast.monthly.map((monthData, i) => {
              const forecastHeight = maxValue > 0 ? ((monthData.mostLikely || monthData.bestCase || 0) / maxValue) * 100 : 0;
              const commitHeight = maxValue > 0 ? ((monthData.commit || 0) / maxValue) * 100 : 0;

              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-3">
                  <div className="w-full flex gap-2 items-end h-32">
                    <div className="flex-1 bg-[#F0EBD8] rounded-xl relative overflow-hidden h-full">
                      <div
                        style={{ height: `${commitHeight}%` }}
                        className="absolute bottom-0 w-full bg-[#1A1A1A] rounded-xl transition-all duration-700"
                      />
                    </div>
                    <div className="flex-1 bg-[#F0EBD8] rounded-xl relative overflow-hidden h-full">
                      <div
                        style={{ height: `${forecastHeight}%` }}
                        className="absolute bottom-0 w-full bg-[#EAD07D] rounded-xl transition-all duration-700"
                      />
                    </div>
                  </div>
                  <span className="text-sm font-medium text-[#666]">
                    {new Date(monthData.month + '-01').toLocaleDateString('en-US', { month: 'short' })}
                  </span>
                </div>
              );
            });
          })()}
        </div>
      ) : (
        <div className="flex items-center justify-center h-40 text-center">
          <div>
            <TrendingUp size={40} className="text-[#999] mx-auto mb-3 opacity-40" />
            <p className="text-[#666]">No forecast data available</p>
            <p className="text-sm text-[#999]">Close some deals to see projections</p>
          </div>
        </div>
      )}
    </Card>
  );
};
