import React, { useState, useCallback, useEffect } from 'react';
import type { AnalysisResponse } from './types';
import { analyzeRoute } from './api/analyzeRoute';
import Header from './components/Header';
import RouteForm from './components/RouteForm';
import TLISection from './components/TLISection';
import TimelineSection from './components/TimelineSection';
import StatsSection from './components/StatsSection';

const App: React.FC = () => {
  const [puBorough, setPuBorough] = useState('Manhattan');
  const [doBorough, setDoBorough] = useState('Bronx');
  const [timeInput, setTimeInput] = useState('07:30');
  const [analysisData, setAnalysisData] = useState<AnalysisResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // API 호출 로직
  const fetchAnalysis = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await analyzeRoute(puBorough, doBorough, timeInput);
      setAnalysisData(data);
    } catch (e: any) {
      setError(e.message || 'API Connection Error.');
    } finally {
      setIsLoading(false);
    }
  }, [puBorough, doBorough, timeInput]);

  // 최초 로드 시 분석 실행 (Optional: 원하지 않으면 제거 가능)
  // useEffect(() => {
  //   fetchAnalysis();
  // }, [fetchAnalysis]);

  const currentMatch = analysisData?.current_match;

  // Time-based analysis data preparation
  const timelineData = analysisData
    ? [...analysisData.nearest_past, ...analysisData.nearest_future]
    : [];

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8 font-display bg-sky-100 dark:bg-slate-900 text-text-light-primary dark:text-text-dark-primary">
      <Header />

      <main className="space-y-8">
        <RouteForm
          puBorough={puBorough}
          setPuBorough={setPuBorough}
          doBorough={doBorough}
          setDoBorough={setDoBorough}
          timeInput={timeInput}
          setTimeInput={setTimeInput}
          onAnalyze={fetchAnalysis}
          isLoading={isLoading}
          error={error}
        />

        {currentMatch && (
          <TLISection currentMatch={currentMatch} />
        )}

        <TimelineSection timelineData={timelineData} />

        <StatsSection
          avgDistance={currentMatch?.avg_distance}
          avgCost={currentMatch?.avg_cost}
        />
      </main>
    </div>
  );
};

export default App;