import React, { useState, useCallback, useEffect } from 'react';
import { Clock, Zap, MapPin, Target } from 'lucide-react';

// --- 타입 정의 (TypeScript) ---
interface TLIResult {
  tli: number;
  avg_duration: number;
  std_duration: number;
  time: string; // HH:MM:SS
}

interface AnalysisResponse {
  current_match: TLIResult;
  nearest_past: TLIResult[];
  nearest_future: TLIResult[];
  status: string;
}

// --- 상수 및 설정 ---
const BOROUGHS = ["Manhattan", "Brooklyn", "Queens", "Bronx", "Staten Island"];
// Python Flask 서버의 기본 주소
const API_URL = 'http://localhost:5000/analyze';
// TLI 점수에 따른 색상 결정
const getTLIColor = (tliScore: number): string => {
  if (tliScore > 0.6) return 'text-red-500'; // 높은 불확실성
  if (tliScore > 0.3) return 'text-yellow-500'; // 보통
  return 'text-green-500'; // 예측 가능
};
const getTLIBarColor = (tliScore: number): string => getTLIColor(tliScore).replace('text-', 'bg-');

// --- TLI 예측 바 컴포넌트 ---
const VolatilityBar: React.FC<{ stdDev: number; avgDur: number }> = ({ stdDev, avgDur }) => {
  // TLI 공식: TLI = STDDEV / AVG (분산 측정)
  const score = avgDur > 0 ? stdDev / avgDur : 0;
  const percent = Math.min(100, Math.round(score * 100 * 2)); // 시각화를 위해 점수를 확대 (최대 100%)
  const colorClass = getTLIBarColor(score);

  return (
    <div className="w-full mt-4">
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        <span>예측 가능</span>
        <span>예측 불가능</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-3">
        <div
          className={`h-3 rounded-full ${colorClass} transition-all duration-1000`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
};

// --- 메인 컴포넌트 ---
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
    setAnalysisData(null);

    // Flask API에 전송할 URL 쿼리 파라미터 구성
    const url = `${API_URL}?pu_borough=${puBorough}&do_borough=${doBorough}&time=${timeInput}`;

    try {
      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok || data.status !== 'success') {
        setError(data.error || '분석 중 서버 오류가 발생했습니다. 경로를 확인하세요.');
        return;
      }

      setAnalysisData(data);
    } catch (e) {
      setError('API 서버 연결 오류. Python 서버(app.py)가 실행 중인지 확인하세요.');
    } finally {
      setIsLoading(false);
    }
  }, [puBorough, doBorough, timeInput]);

  // 최초 로드 시 분석 실행 (초기 시각화를 위해)
  useEffect(() => {
    fetchAnalysis();
  }, [fetchAnalysis]);

  const currentMatch = analysisData?.current_match;
  const volatilityScore = currentMatch ? currentMatch.std_duration / currentMatch.avg_duration : 0;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans antialiased">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-extrabold text-gray-900 flex items-center justify-center">
          <Zap className="w-7 h-7 mr-3 text-red-600" />
          Taxi Luck Index 분석 서비스
        </h1>
        <p className="text-gray-600 mt-1">Python API에서 실시간 TLI 분석 결과를 가져옵니다.</p>
      </header>

      {/* --- 입력 UI 섹션 --- */}
      <div className="bg-white p-6 rounded-xl shadow-lg mb-8 max-w-2xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">

          {/* 출발지 */}
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-1">출발지</label>
            <select value={puBorough} onChange={(e) => setPuBorough(e.target.value)} className="p-3 border rounded-lg">
              {BOROUGHS.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>

          {/* 도착지 */}
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-1">도착지</label>
            <select value={doBorough} onChange={(e) => setDoBorough(e.target.value)} className="p-3 border rounded-lg">
              {BOROUGHS.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>

          {/* 시간 */}
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-1">출발 시간 (HH:MM)</label>
            <input type="text" value={timeInput} onChange={(e) => setTimeInput(e.target.value)} placeholder="07:30" className="p-3 border rounded-lg" />
          </div>

          {/* 버튼 */}
          <button onClick={fetchAnalysis} disabled={isLoading} className={`p-3 rounded-lg font-bold text-white transition duration-200 shadow-md ${isLoading
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800'
            }`}>
            {isLoading ? <RefreshCw className="w-5 h-5 mx-auto animate-spin" /> : '경로 분석 시작'}
          </button>
        </div>
      </div>

      {/* --- 결과 섹션 --- */}
      {error && (
        <div className="max-w-2xl mx-auto p-4 bg-red-100 text-red-800 border rounded-lg mb-4">
          오류: {error}
        </div>
      )}

      {currentMatch && (
        <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Task 1: 현재 TLI 분석 (가장 가까운 매치) */}
          <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-lg border-l-4 border-indigo-600 text-center">
            <h2 className="text-xl font-bold mb-2 text-gray-800">
              현재 시간 TLI
            </h2>
            <p className="text-sm text-gray-500 mb-4">가장 가까운 블록: {currentMatch.time.substring(0, 5)}</p>
            <p className={`text-6xl font-extrabold ${getTLIColor(volatilityScore)}`}>
              {currentMatch.tli.toFixed(2)}
            </p>
            <p className="text-xl font-semibold text-gray-700 mt-2">평균 이동 시간: {currentMatch.avg_duration.toFixed(0)}분</p>
            <p className="text-sm text-gray-500">변동성: ±{currentMatch.std_duration.toFixed(2)}분</p>
            <VolatilityBar stdDev={currentMatch.std_duration} avgDur={currentMatch.avg_duration} />
          </div>

          {/* Task 2: 주변 시간대 분석 */}
          <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-lg">
            <h2 className="text-xl font-bold mb-4 text-gray-800">
              주변 시간대 변동성 비교 (±3개)
            </h2>
            <div className="flex flex-col space-y-4">
              {/* 과거 시간대 */}
              <div className="border-b pb-2">
                <h3 className="text-base font-semibold text-gray-600 mb-2">이전 시간 ({analysisData?.nearest_past.length}개)</h3>
                <div className="grid grid-cols-3 gap-3">
                  {analysisData?.nearest_past.map((item, index) => (
                    <div key={index} className="p-3 border rounded-lg bg-gray-50 text-center">
                      <p className="text-xs text-gray-500">{item.time.substring(0, 5)}</p>
                      <p className={`text-2xl font-bold ${getTLIColor(item.std_duration / item.avg_duration)}`}>{item.tli.toFixed(2)}</p>
                      <p className="text-xs text-gray-600">±{item.std_duration.toFixed(1)}분</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* 미래 시간대 */}
              <div>
                <h3 className="text-base font-semibold text-gray-600 mb-2">이후 시간 ({analysisData?.nearest_future.length}개)</h3>
                <div className="grid grid-cols-3 gap-3">
                  {analysisData?.nearest_future.map((item, index) => (
                    <div key={index} className="p-3 border rounded-lg bg-gray-50 text-center">
                      <p className="text-xs text-gray-500">{item.time.substring(0, 5)}</p>
                      <p className={`text-2xl font-bold ${getTLIColor(item.std_duration / item.avg_duration)}`}>{item.tli.toFixed(2)}</p>
                      <p className="text-xs text-gray-600">±{item.std_duration.toFixed(1)}분</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;