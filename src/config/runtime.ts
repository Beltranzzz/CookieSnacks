import { BACKGROUNDS, type Settings } from '../domain/settings';
import { EXPENSE_CATEGORIES, PAYMENT_METHODS, PRODUCT_CATEGORIES } from './constants';

// Valores de configuración que necesitan funciones fuera de React (formato de dinero, títulos)
export const runtime = { businessName: 'CookieSnacks', currency: 'MXN' };

const replace = <T>(target: T[], next: T[]) => { target.splice(0, target.length, ...next); };

export function applySettings(s: Settings) {
  runtime.businessName = s.businessName;
  runtime.currency = s.currency;
  replace(PAYMENT_METHODS, s.paymentMethods);
  replace(EXPENSE_CATEGORIES, s.expenseCategories);
  replace(PRODUCT_CATEGORIES, s.productCategories);
  const bg = BACKGROUNDS.find((b) => b.id === s.background) ?? BACKGROUNDS[0];
  document.documentElement.style.setProperty('--cream', bg.value);
  document.title = s.businessName;
}
