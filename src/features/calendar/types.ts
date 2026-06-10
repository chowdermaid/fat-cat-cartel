export type BirthdayEvent = {
  type: "birthday";
  lodestoneId: string;
  name: string;
  avatarUrl: string | null;
  month: number;
  day: number;
};

export type PlannerEvent = {
  type: "planner";
  id: string;
  title: string;
  description: string | null;
  startAt: number;
  endAt: number | null;
  location: string | null;
  sourceUrl: string | null;
  lastSyncedAt: number | null;
  status: string | null;
};

export type CalendarEvent = BirthdayEvent | PlannerEvent;

export type CalendarEventRequest = {
  id: string;
  title: string;
  description: string | null;
  startAt: number;
  roleIds: string[];
  submittedAt: number;
  creator: {
    discordUserId: string;
    lodestoneId: string;
    characterName: string;
    fcRank: string | null;
    avatarUrl: string | null;
  };
};

export type CalendarDay = {
  date: Date;
  inMonth: boolean;
};
