import assert from 'node:assert/strict';
import { test } from 'node:test';
import { normalizeAdminDto } from '../src/services/adminDto.ts';

const normalize = (path, data) => normalizeAdminDto(path, data);

test('category DTO keeps the station reference used by the existing UI', () => {
  const result = normalize('/admin/categories', { id: 2, name: 'Hải sản', stationId: 3, kitchenStation: 'Bếp hải sản' });
  assert.deepEqual(result.kitchenStation, { id: 3, name: 'Bếp hải sản' });
});
test('food DTO supports reading and reopening the edit form', () => {
  const result = normalize('/admin/foods/4', { id: 4, categoryId: 2, category: 'Hải sản', name: 'Mực nướng', price: 169000 });
  assert.deepEqual(result.category, { id: 2, name: 'Hải sản' });
  assert.equal(result.price, 169000);
});
test('recipe DTO is handled before treating it as a food response', () => {
  const result = normalizeAdminDto('/admin/foods/4/recipes', [{ id: 9, foodId: 4, foodName: 'Mực nướng', ingredientId: 6, ingredientName: 'Mực tươi', ingredientUnit: 'kg', quantityRequired: 0.2 }]);
  assert.equal(result[0].food.id, 4);
  assert.equal(result[0].ingredient.unit, 'kg');
  assert.equal(result[0].quantityRequired, 0.2);
});
test('saved recipe responses use the same edit model', () => {
  const result = normalize('/admin/recipes/9', { id: 9, foodId: 4, foodName: 'Mực nướng', ingredientId: 6, ingredientName: 'Mực', ingredientUnit: 'kg' });
  assert.equal(result.ingredient.id, 6);
});
test('stock transaction retains ingredient name and unit', () => {
  const result = normalize('/admin/stock-transactions', { id: 1, ingredientId: 6, ingredientName: 'Mực', ingredientUnit: 'kg', quantity: 2 });
  assert.equal(result.ingredient.name, 'Mực');
  assert.equal(result.ingredient.unit, 'kg');
});
test('option retains food, group and nullable ingredient references', () => {
  const result = normalize('/admin/options', { id: 1, foodId: 4, foodName: 'Mực', groupId: 2, groupName: 'Topping', ingredientId: null });
  assert.equal(result.optionGroup.id, 2);
  assert.equal(result.food.name, 'Mực');
  assert.equal(result.ingredient, null);
});
test('combo items retain the composite key needed to delete or edit items', () => {
  const result = normalize('/admin/combos/3/items', { comboId: 3, foodId: 4, foodName: 'Mực', foodPrice: 169000, quantity: 2 });
  assert.deepEqual(result.id, { comboId: 3, foodId: 4 });
  assert.equal(result.food.price, 169000);
});
test('old nested responses and unrelated endpoints remain unchanged', () => {
  const food = { id: 1, category: { id: 2, name: 'Món bò' } };
  assert.equal(normalizeAdminDto('/admin/foods', food), food);
  assert.equal(normalizeAdminDto('/admin/auth/me', { role: 'ADMIN' })?.role, 'ADMIN');
  assert.equal(normalizeAdminDto('/admin/recipes', null), null);
});
