export interface PaymentMethodDef { id: string; label: string }

export interface Settings {
  businessName: string;
  currency: string;
  paymentMethods: PaymentMethodDef[];
  expenseCategories: string[];
  productCategories: string[];
  background: string;
  lastBackupAt?: string;
  updatedAt?: string; // para sincronizar: gana la configuración más reciente
}

export const DEFAULT_SETTINGS: Settings = {
  businessName: 'CookieSnacks',
  currency: 'MXN',
  paymentMethods: [
    { id: 'efectivo', label: 'Efectivo' },
    { id: 'tarjeta', label: 'Tarjeta' },
    { id: 'transferencia', label: 'Transferencia' },
    { id: 'otro', label: 'Otro' },
  ],
  expenseCategories: ['Ingredientes', 'Producto', 'Empaques', 'Transporte', 'Publicidad', 'Servicios', 'Equipo', 'Otros'],
  productCategories: ['Cookies', 'Brownies', 'Banderillas', 'Bebidas', 'Combos', 'Otros'],
  background: 'crema',
};

export const CURRENCIES = [
  { code: 'MXN', label: 'Peso mexicano (MXN)' },
  { code: 'USD', label: 'Dólar (USD)' },
  { code: 'EUR', label: 'Euro (EUR)' },
];

export const BACKGROUNDS = [
  { id: 'crema', label: 'Crema', value: '#FFF8F0' },
  { id: 'blanco', label: 'Blanco', value: '#FFFFFF' },
  { id: 'rosa', label: 'Rosa suave', value: '#FFF0F5' },
  { id: 'azul', label: 'Azul suave', value: '#EFF7FC' },
];
