export type UsageLog = {
    readonly requestedAt: string;
    readonly filter: string;
    readonly durationMs: number;
    readonly resultCount: number;
    readonly error: string | null;
};

export type UsageRepository = {
    readonly record: (log: UsageLog) => void;
    readonly findAll: () => readonly UsageLog[];
};
