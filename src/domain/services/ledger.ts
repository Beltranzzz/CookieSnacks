import { expensesRepo, salesRepo } from '../../data/repositories';
import { dateKey } from '../../lib/dates';
import { newId } from '../../lib/id';
import { toCents } from '../../lib/money';
import type { PaymentMethod } from '../models';

// unitCost va en centavos (viene del producto); los demás montos, en pesos
export interface SaleInput {
  concept: string; quantity: number; unitPrice: number; paymentMethod: PaymentMethod;
  notes?: string; at?: Date; productId?: string; unitCost?: number;
}
export interface ExpenseInput { concept: string; category: string; amount: number; paymentMethod: PaymentMethod; notes?: string; at?: Date }

const common = (i: { concept: string; paymentMethod: PaymentMethod; notes?: string; at?: Date }) => {
  const at = i.at ?? new Date();
  return {
    concept: i.concept.trim(),
    paymentMethod: i.paymentMethod,
    notes: i.notes?.trim() || undefined,
    occurredAt: at.toISOString(),
    dateKey: dateKey(at),
  };
};

const saleAmounts = (quantity: number, unitPricePesos: number) => {
  const unitPrice = toCents(unitPricePesos);
  return { quantity, unitPrice, total: Math.round(unitPrice * quantity) };
};

export function registerSale(i: SaleInput) {
  const now = new Date().toISOString();
  return salesRepo.add({
    id: newId(), ...common(i), ...saleAmounts(i.quantity, i.unitPrice),
    productId: i.productId, unitCost: i.unitCost, createdAt: now, updatedAt: now,
  });
}

export function registerExpense(i: ExpenseInput) {
  const now = new Date().toISOString();
  return expensesRepo.add({ id: newId(), ...common(i), category: i.category, total: toCents(i.amount), createdAt: now, updatedAt: now });
}

export function updateSale(id: string, i: SaleInput) {
  return salesRepo.update(id, {
    ...common(i), ...saleAmounts(i.quantity, i.unitPrice),
    productId: i.productId, unitCost: i.unitCost, updatedAt: new Date().toISOString(),
  });
}

export function updateExpense(id: string, i: ExpenseInput) {
  return expensesRepo.update(id, { ...common(i), category: i.category, total: toCents(i.amount), updatedAt: new Date().toISOString() });
}

export function deleteEntry(kind: 'venta' | 'gasto', id: string) {
  return kind === 'venta' ? salesRepo.remove(id) : expensesRepo.remove(id);
}
