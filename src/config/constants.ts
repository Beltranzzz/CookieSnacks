import { DEFAULT_SETTINGS, type PaymentMethodDef } from '../domain/settings';

// Listas "vivas": applySettings (config/runtime.ts) las actualiza en el lugar
// para que todas las pantallas vean los cambios hechos en Configuración.
export const PAYMENT_METHODS: PaymentMethodDef[] = [...DEFAULT_SETTINGS.paymentMethods];
export const EXPENSE_CATEGORIES: string[] = [...DEFAULT_SETTINGS.expenseCategories];
export const PRODUCT_CATEGORIES: string[] = [...DEFAULT_SETTINGS.productCategories];

export const CATEGORY_EMOJI: Record<string, string> = {
  Cookies: '🍪', Brownies: '🍫', Banderillas: '🌭', Bebidas: '🥤', Combos: '🎁', Otros: '🧁',
};
