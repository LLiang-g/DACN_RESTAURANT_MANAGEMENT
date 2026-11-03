/** Adapt An's flat admin DTOs to the nested view models used by the current UI. */
export function normalizeAdminDto(path: string, value: unknown): unknown {
  if (Array.isArray(value)) return value.map(item => normalizeAdminDto(path, item));
  if (!value || typeof value !== 'object') return value;
  const dto = value as Record<string, unknown>;
  const ref = (id: unknown, name: unknown, extra = {}) =>
    id == null ? null : { id, name: name ?? '', ...extra };

  if (/^\/admin\/categories(?:\/\d+)?$/.test(path) && 'stationId' in dto) {
    return { ...dto, kitchenStation: ref(dto.stationId, dto.kitchenStation) };
  }
  if (/^\/admin\/foods(?:\/\d+)?$/.test(path) && 'categoryId' in dto) {
    return { ...dto, category: ref(dto.categoryId, dto.category) };
  }
  if (/^\/admin\/(?:recipes(?:\/\d+)?|foods\/\d+\/recipes)$/.test(path) && 'foodId' in dto) {
    return { ...dto, food: ref(dto.foodId, dto.foodName),
      ingredient: ref(dto.ingredientId, dto.ingredientName, { unit: dto.ingredientUnit }) };
  }
  if (path === '/admin/stock-transactions' && 'ingredientId' in dto) {
    return { ...dto, ingredient: ref(dto.ingredientId, dto.ingredientName, { unit: dto.ingredientUnit }) };
  }
  if (/^\/admin\/options(?:\/\d+)?$/.test(path) && 'groupId' in dto) {
    return { ...dto, food: ref(dto.foodId, dto.foodName),
      optionGroup: ref(dto.groupId, dto.groupName), ingredient: ref(dto.ingredientId, dto.ingredientName) };
  }
  if (/^\/admin\/combos\/\d+\/items$/.test(path) && 'foodId' in dto) {
    return { ...dto, id: { comboId: dto.comboId, foodId: dto.foodId },
      food: ref(dto.foodId, dto.foodName, { price: dto.foodPrice }) };
  }
  return value;
}
