export interface TLIResult {
    tli: number;
    avg_duration: number;
    std_duration: number;
    time: string; // HH:MM:SS
    avg_distance: number; // miles
    avg_cost: number; // USD
    ci_score: number;
}

export interface AnalysisResponse {
    current_match: TLIResult;
    nearest_past: TLIResult[];
    nearest_future: TLIResult[];
    status: string;
    error?: string;
}
