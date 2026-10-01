import { productsRepo } from '../../data/repositories';
import { newId } from '../../lib/id';
import { toCents } from '../../lib/money';

// price y cost en pesos
export interface ProductInput { name: string; category: string; price: number; cost: number; image?: string; active: boolean }

export function createProduct(i: ProductInput) {
  const now = new Date().toISOString();
  return productsRepo.add({
    id: newId(), name: i.name.trim(), category: i.category,
    price: toCents(i.price), cost: toCents(i.cost), image: i.image, active: i.active,
    createdAt: now, updatedAt: now,
  });
}

export function updateProduct(id: string, i: ProductInput) {
  return productsRepo.update(id, {
    name: i.name.trim(), category: i.category,
    price: toCents(i.price), cost: toCents(i.cost), image: i.image, active: i.active,
    updatedAt: new Date().toISOString(),
  });
}

export const setProductActive = (id: string, active: boolean) =>
  productsRepo.update(id, { active, updatedAt: new Date().toISOString() });
