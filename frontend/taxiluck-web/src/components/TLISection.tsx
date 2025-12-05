import React from 'react';
import type { TLIResult } from '../types';
import { getTLIColorClass } from '../utils/tliUtils';

interface TLISectionProps {
    currentMatch: TLIResult;
}

const TLISection: React.FC<TLISectionProps> = ({ currentMatch }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* TLI Section */}
            <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-lg shadow-sm space-y-6">
                <h3 className="text-lg font-bold">Taxi Luck Index (TLI)</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
                    <div className="flex flex-col items-center">
                        <div className="relative w-40 h-40">
                            <svg className="w-full h-full" viewBox="0 0 36 36">
                                <path className="text-gray-200 dark:text-gray-600" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3"></path>
                                <path
                                    className={getTLIColorClass(currentMatch.tli)}
                                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeDasharray={`${Math.min(currentMatch.tli * 100, 100)}, 100`}
                                    strokeLinecap="round"
                                    strokeWidth="3"
                                ></path>
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className={`text-4xl font-extrabold ${getTLIColorClass(currentMatch.tli)}`}>
                                    {currentMatch.tli.toFixed(2)}
                                </span>
                                <span className="text-sm text-text-light-secondary dark:text-text-dark-secondary">TLI Score</span>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className={`border p-3 rounded-lg ${currentMatch.tli <= 0.25 ? 'border-green-300 bg-green-50 dark:bg-green-900/30' : 'bg-slate-50 dark:bg-background-dark'}`}>
                            <p className={`font-bold ${currentMatch.tli <= 0.25 ? 'text-green-700 dark:text-green-400' : ''}`}>0.0 - 0.25</p>
                            <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">Predictable, lucky time, stable traffic patterns</p>
                        </div>
                        <div className={`border p-3 rounded-lg ${currentMatch.tli > 0.25 && currentMatch.tli <= 0.50 ? 'border-orange-300 bg-orange-50 dark:bg-orange-900/30' : 'bg-slate-50 dark:bg-background-dark'}`}>
                            <p className={`font-bold ${currentMatch.tli > 0.25 && currentMatch.tli <= 0.50 ? 'text-orange-700 dark:text-orange-400' : ''}`}>0.26 - 0.50</p>
                            <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">Moderate, affected by weather/signals/traffic</p>
                        </div>
                        <div className={`border p-3 rounded-lg ${currentMatch.tli > 0.50 ? 'border-red-300 bg-red-50 dark:bg-red-900/30' : 'bg-slate-50 dark:bg-background-dark'}`}>
                            <p className={`font-bold ${currentMatch.tli > 0.50 ? 'text-red-700 dark:text-red-400' : ''}`}>0.51 or higher</p>
                            <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">Uncertain, unlucky time, high traffic volatility</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-indigo-100 dark:bg-indigo-900/50 p-4 rounded-lg text-center">
                        <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-300">
                            {currentMatch.avg_duration.toFixed(0)}<span className="text-lg">min</span>
                        </p>
                        <p className="text-sm text-indigo-500 dark:text-indigo-400">Average Time</p>
                    </div>
                    <div className="bg-orange-100 dark:bg-orange-900/50 p-4 rounded-lg text-center">
                        <p className="text-3xl font-bold text-orange-600 dark:text-orange-300">
                            ±{currentMatch.std_duration.toFixed(1)}<span className="text-lg">min</span>
                        </p>
                        <p className="text-sm text-orange-500 dark:text-orange-400">Std Deviation</p>
                    </div>
                </div>
            </div>

            {/* Congestion Index (CI) */}
            <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-lg shadow-sm space-y-6">
                <h3 className="text-lg font-bold flex items-center justify-between">
                    Congestion Index (CI)
                </h3>
                <div className="flex flex-col items-center space-y-6">
                    <div className="relative w-40 h-40">
                        <svg className="w-full h-full" viewBox="0 0 36 36">
                            <path className="text-gray-200 dark:text-gray-600" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3"></path>
                            <path className="text-orange-500" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeDasharray="45, 100" strokeLinecap="round" strokeWidth="3"></path>
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-4xl font-extrabold text-orange-500">{currentMatch.ci_score.toFixed(2)}</span>
                            <span className="text-sm text-text-light-secondary dark:text-text-dark-secondary">CI Score</span>
                        </div>
                    </div>
                    <div className="w-full space-y-4">
                        <div className="bg-slate-50 dark:bg-background-dark p-3 rounded-lg text-center">
                            <p className="font-bold">0.0 - 0.25</p>
                            <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary flex items-center justify-center gap-2">
                                <span className="material-icons text-green-500 text-base">traffic</span> Low Congestion, fast travel
                            </p>
                        </div>
                        <div className="border border-orange-300 dark:border-orange-600 bg-orange-50 dark:bg-orange-900/30 p-3 rounded-lg text-center">
                            <p className="font-bold text-orange-700 dark:text-orange-400">0.26 - 0.50</p>
                            <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary flex items-center justify-center gap-2">
                                <span className="material-icons text-yellow-500 text-base">warning</span> Moderate Congestion, some sections congested
                            </p>
                        </div>
                        <div className="bg-slate-50 dark:bg-background-dark p-3 rounded-lg text-center">
                            <p className="font-bold">0.51 or higher</p>
                            <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary flex items-center justify-center gap-2">
                                <span className="material-icons text-red-500 text-base">error</span> Severe Congestion, travel delays likely
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TLISection;
