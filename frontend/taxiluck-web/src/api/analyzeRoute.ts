import type { AnalysisResponse } from '../types';

const API_URL = 'http://localhost:5001/analyze';

// import { MOCK_ANALYSIS_RESPONSE } from '../mocks/mockData';

export const analyzeRoute = async (
    puBorough: string,
    doBorough: string,
    time: string
): Promise<AnalysisResponse> => {
    const url = `${API_URL}?pu_borough=${puBorough}&do_borough=${doBorough}&time=${time}`;

    // Simulate network delay
    // await new Promise(resolve => setTimeout(resolve, 500));

    // return MOCK_ANALYSIS_RESPONSE;

    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok || data.status !== 'success') {
        throw new Error(data.error || 'Server Error');
    }

    return data;
};
