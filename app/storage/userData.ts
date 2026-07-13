import { z } from "zod";
import type { UserData } from "../domain/models";

export const USER_DATA_STORAGE_KEY = "stockpilot-user-data-v1";
const THEME_STORAGE_KEY = "stockpilot-theme";

const ticker = z.enum(["AAPL", "MSFT", "NVDA", "AMZN", "TSLA"]);
const checklist = z.object({ why: z.string(), holding: z.string(), invalidation: z.string(), maxLoss: z.string(), weight: z.string(), driver: z.string(), event: z.string(), target: z.string(), exit: z.string() });
const watchlist = z.object({ ticker, target: z.number().finite(), reason: z.string(), status: z.enum(["Researching", "Watching", "Ready to Buy", "Avoiding"]) });
const trade = z.object({ id: z.number().int(), ticker, buyPrice: z.number().finite(), shares: z.number().finite().nonnegative(), date: z.string(), target: z.number().finite(), maxLoss: z.number().finite(), thesis: z.string(), invalidation: z.string(), holding: z.string(), closed: z.boolean().optional(), sellPrice: z.number().finite().optional() });
const journal = z.object({ tradeId: z.number().int(), buyReason: z.string(), sellReason: z.string(), emotionalState: z.string(), whatWentWell: z.string(), whatWentWrong: z.string(), thesisCorrect: z.string(), processCorrect: z.string(), lessonsLearned: z.string(), mistakeCategories: z.array(z.string()) });
export const userDataSchema = z.object({ version: z.literal(1), watchlist: z.array(watchlist), trades: z.array(trade), checklistDrafts: z.record(ticker, checklist).default({}), journals: z.record(z.string(), journal).default({}) });

export function emptyUserData(): UserData {
  return { version: 1, watchlist: [], trades: [], checklistDrafts: {}, journals: {} };
}

export function getBrowserStorage(): Storage | undefined {
  try {
    return typeof window === "undefined" ? undefined : window.localStorage;
  } catch {
    return undefined;
  }
}

export function readThemePreference(storage?: Storage): "light" | "dark" {
  if (!storage) return "light";
  try {
    return storage.getItem(THEME_STORAGE_KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

export function writeThemePreference(theme: "light" | "dark", storage?: Storage): boolean {
  try {
    storage?.setItem(THEME_STORAGE_KEY, theme);
    return Boolean(storage);
  } catch {
    return false;
  }
}

export function readUserData(storage?: Storage): { data: UserData; recovered: boolean; hasSavedData: boolean } {
  if (!storage) return { data: emptyUserData(), recovered: false, hasSavedData: false };
  try {
    const raw = storage.getItem(USER_DATA_STORAGE_KEY);
    if (!raw) return { data: emptyUserData(), recovered: false, hasSavedData: false };
    const parsed = userDataSchema.safeParse(JSON.parse(raw));
    return parsed.success ? { data: parsed.data as UserData, recovered: false, hasSavedData: true } : { data: emptyUserData(), recovered: true, hasSavedData: true };
  } catch {
    return { data: emptyUserData(), recovered: true, hasSavedData: true };
  }
}

export function writeUserData(data: UserData, storage?: Storage): boolean {
  if (!storage) return false;
  const parsed = userDataSchema.safeParse(data);
  if (!parsed.success) return false;
  try {
    storage.setItem(USER_DATA_STORAGE_KEY, JSON.stringify(parsed.data));
    return true;
  } catch {
    return false;
  }
}
