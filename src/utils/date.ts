import { format, parseISO, differenceInDays, differenceInMonths, isValid } from 'date-fns';
import { fr } from 'date-fns/locale';

export const getTodayISO = (): string => new Date().toISOString().split('T')[0];

export const getTimestamp = (): string => new Date().toISOString().replace(/[:.]/g, '-');

export const formatDateFr = (date: Date | string | null | undefined): string => {
  if (!date) return '-';
  const d = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(d)) return '-';
  return format(d, 'dd/MM/yyyy', { locale: fr });
};

export const formatDateTimeFr = (date: Date | string | null | undefined): string => {
  if (!date) return '-';
  const d = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(d)) return '-';
  return format(d, 'dd/MM/yyyy HH:mm', { locale: fr });
};

export const getDaysAgo = (date: Date | string): number => {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return differenceInDays(new Date(), d);
};

export const getMonthsAgo = (date: Date | string): number => {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return differenceInMonths(new Date(), d);
};

export const isWithinDays = (date: Date | string, days: number): boolean => {
  return getDaysAgo(date) <= days;
};

export const isWithinMonths = (date: Date | string, months: number): boolean => {
  return getMonthsAgo(date) <= months;
};
