import type { AnalysisResponse } from '../types';

export const MOCK_ANALYSIS_RESPONSE: AnalysisResponse = {
    status: 'success',
    current_match: {
        tli: 1.2,
        avg_duration: 15.5,
        std_duration: 2.1,
        time: '14:30:00',
        avg_distance: 12.8,
        avg_cost: 15.70
    },
    nearest_past: [
        { tli: 1.1, avg_duration: 16.0, std_duration: 2.0, time: '14:00:00', avg_distance: 12.4, avg_cost: 15.50 },
        { tli: 1.15, avg_duration: 15.8, std_duration: 2.2, time: '14:15:00', avg_distance: 12.6, avg_cost: 15.80 }
    ],
    nearest_future: [
        { tli: 1.3, avg_duration: 14.5, std_duration: 1.9, time: '14:45:00', avg_distance: 12.3, avg_cost: 15.60 },
        { tli: 1.4, avg_duration: 14.0, std_duration: 1.8, time: '15:00:00', avg_distance: 12.2, avg_cost: 15.40 }
    ]
};
