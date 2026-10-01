// Los ids de método de pago son configurables (Configuración); por defecto: efectivo, tarjeta, transferencia, otro
export type PaymentMethod = string;

// Todos los montos se guardan en CENTAVOS (enteros) para evitar errores de decimales.
interface BaseRecord {
  id: string;
  concept: string;
  total: number;
  occurredAt: string; // ISO con fecha y hora reales del dispositivo
  dateKey: string;    // "YYYY-MM-DD" local, para consultas rápidas (calendario/reportes)
  paymentMethod: PaymentMethod;
  notes?: string;
  deletedAt?: string; // borrado lógico, para sincronizar los borrados entre dispositivos
  createdAt: string;
  updatedAt: string;
}

export interface Sale extends BaseRecord {
  quantity: number;
  unitPrice: number;
  productId?: string; // si la venta salió de un producto del catálogo
  unitCost?: number;  // costo del producto al momento de la venta (para la utilidad estimada)
}

export interface Expense extends BaseRecord {
  category: string;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  price: number; // precio de venta (centavos)
  cost: number;  // costo (centavos)
  image?: string; // foto reducida, en formato data URL
  active: boolean;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
}
