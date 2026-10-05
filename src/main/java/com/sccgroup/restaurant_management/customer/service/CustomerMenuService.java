package com.sccgroup.restaurant_management.customer.service;

import com.sccgroup.restaurant_management.common.exception.ResourceNotFoundException;
import com.sccgroup.restaurant_management.customer.dto.FoodDetailResponse;
import com.sccgroup.restaurant_management.customer.dto.MenuResponse;
import com.sccgroup.restaurant_management.customer.dto.TableInfoResponse;
import com.sccgroup.restaurant_management.domain.entity.floor.RestaurantTable;
import com.sccgroup.restaurant_management.domain.entity.inventory.Recipe;
import com.sccgroup.restaurant_management.domain.entity.menu.Category;
import com.sccgroup.restaurant_management.domain.entity.menu.Combo;
import com.sccgroup.restaurant_management.domain.entity.menu.ComboItem;
import com.sccgroup.restaurant_management.domain.entity.menu.Food;
import com.sccgroup.restaurant_management.domain.entity.menu.Option;
import com.sccgroup.restaurant_management.domain.repository.floor.RestaurantTableRepository;
import com.sccgroup.restaurant_management.domain.repository.inventory.RecipeRepository;
import com.sccgroup.restaurant_management.domain.repository.menu.ComboItemRepository;
import com.sccgroup.restaurant_management.domain.repository.menu.ComboRepository;
import com.sccgroup.restaurant_management.domain.repository.menu.FoodRepository;
import com.sccgroup.restaurant_management.domain.repository.menu.OptionRepository;
import com.sccgroup.restaurant_management.domain.service.ComboPriceCalculator;
import com.sccgroup.restaurant_management.domain.service.IngredientRequirementCalculator;
import com.sccgroup.restaurant_management.domain.service.IngredientRequirementCalculator.IngredientNeed;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/** Nghiệp vụ "xem thực đơn" của khách. Không yêu cầu đăng nhập. */
@Service
public class CustomerMenuService {

    private final RestaurantTableRepository tableRepository;
    private final FoodRepository foodRepository;
    private final OptionRepository optionRepository;
    private final ComboRepository comboRepository;
    private final ComboItemRepository comboItemRepository;
    private final RecipeRepository recipeRepository;
    private final IngredientRequirementCalculator requirementCalculator;
    private final ComboPriceCalculator comboPriceCalculator;

    public CustomerMenuService(RestaurantTableRepository tableRepository,
                               FoodRepository foodRepository,
                               OptionRepository optionRepository,
                               ComboRepository comboRepository,
                               ComboItemRepository comboItemRepository,
                               RecipeRepository recipeRepository,
                               IngredientRequirementCalculator requirementCalculator,
                               ComboPriceCalculator comboPriceCalculator) {
        this.tableRepository = tableRepository;
        this.foodRepository = foodRepository;
        this.optionRepository = optionRepository;
        this.comboRepository = comboRepository;
        this.comboItemRepository = comboItemRepository;
        this.recipeRepository = recipeRepository;
        this.requirementCalculator = requirementCalculator;
        this.comboPriceCalculator = comboPriceCalculator;
    }

    /** Xác nhận bàn từ mã QR và trả thông tin để hiển thị ("Bàn 5 - Tầng 1"). */
    @Transactional(readOnly = true)
    public TableInfoResponse getTable(Long tableId) {
        RestaurantTable table = tableRepository.findById(tableId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy bàn với ID " + tableId));
        return new TableInfoResponse(table.getId(), table.getFloor(), table.getTableNumber());
    }

    /** Toàn bộ thực đơn: món theo danh mục + combo, kèm trạng thái còn/tạm hết tự suy ra từ kho. */
    @Transactional(readOnly = true)
    public MenuResponse getMenu() {
        List<Food> foods = foodRepository.findAllWithCategory();
        Map<Long, List<Recipe>> recipesByFood =
                requirementCalculator.groupByFood(recipeRepository.findAllWithIngredient());

        Set<Long> foodIdsWithOptions = new HashSet<>();
        if (!foods.isEmpty()) {
            List<Long> foodIds = foods.stream().map(Food::getId).toList();
            for (Option o : optionRepository.findByFoodIdIn(foodIds)) {
                foodIdsWithOptions.add(o.getFood().getId());
            }
        }

        // ---- Danh mục món (bỏ danh mục rỗng) ----
        Map<Long, String> categoryNames = new LinkedHashMap<>();
        Map<Long, List<MenuResponse.FoodDto>> foodsByCategory = new LinkedHashMap<>();
        for (Food f : foods) {
            Category c = f.getCategory();
            categoryNames.putIfAbsent(c.getId(), c.getName());
            foodsByCategory.computeIfAbsent(c.getId(), k -> new ArrayList<>()).add(new MenuResponse.FoodDto(
                    f.getId(), f.getName(), f.getPrice(), f.getImage(), f.getDescription(),
                    f.getEstimatedCookingTime(),
                    isFoodAvailable(recipesByFood.get(f.getId())),
                    foodIdsWithOptions.contains(f.getId())));
        }
        List<MenuResponse.CategoryDto> categories = new ArrayList<>();
        foodsByCategory.forEach((id, list) ->
                categories.add(new MenuResponse.CategoryDto(id, categoryNames.get(id), list)));

        // ---- Combo ----
        Map<Long, List<ComboItem>> itemsByCombo = new HashMap<>();
        for (ComboItem ci : comboItemRepository.findAllWithFood()) {
            itemsByCombo.computeIfAbsent(ci.getCombo().getId(), k -> new ArrayList<>()).add(ci);
        }
        List<MenuResponse.ComboDto> combos = new ArrayList<>();
        for (Combo combo : comboRepository.findAll(Sort.by("id"))) {
            List<ComboItem> items = itemsByCombo.getOrDefault(combo.getId(), List.of());
            if (items.isEmpty()) continue; // combo chưa có món con thì không thể đặt
            items.sort(Comparator.comparing(ci -> ci.getFood().getId()));

            List<MenuResponse.ComboItemDto> itemDtos = items.stream()
                    .map(ci -> new MenuResponse.ComboItemDto(
                            ci.getFood().getId(), ci.getFood().getName(), ci.getQuantity(),
                            foodIdsWithOptions.contains(ci.getFood().getId())))
                    .toList();

            combos.add(new MenuResponse.ComboDto(
                    combo.getId(), combo.getName(),
                    comboPriceCalculator.price(combo, items),
                    comboPriceCalculator.originalPrice(items),
                    isComboAvailable(items, recipesByFood),
                    itemDtos));
        }

        return new MenuResponse(categories, combos);
    }

    /** Chi tiết một món kèm các nhóm tùy chọn (để khách chọn size, độ cay, thêm/bớt...). */
    @Transactional(readOnly = true)
    public FoodDetailResponse getFoodDetail(Long foodId) {
        Food food = foodRepository.findById(foodId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy món với ID " + foodId));

        List<Recipe> recipes = recipeRepository.findByFoodIdIn(List.of(foodId));
        List<Option> options = optionRepository.findByFoodId(foodId);
        options.sort(Comparator.comparing(Option::getId));

        Map<Long, String> groupNames = new LinkedHashMap<>();
        Map<Long, Option> firstOfGroup = new HashMap<>();
        Map<Long, List<FoodDetailResponse.OptionDto>> optionsByGroup = new LinkedHashMap<>();
        for (Option o : options) {
            Long gid = o.getOptionGroup().getId();
            groupNames.putIfAbsent(gid, o.getOptionGroup().getName());
            firstOfGroup.putIfAbsent(gid, o);
            BigDecimal delta = o.getPriceDelta() == null ? BigDecimal.ZERO : o.getPriceDelta();
            optionsByGroup.computeIfAbsent(gid, k -> new ArrayList<>())
                    .add(new FoodDetailResponse.OptionDto(o.getId(), o.getName(), delta));
        }
        List<FoodDetailResponse.OptionGroupDto> groups = new ArrayList<>();
        optionsByGroup.forEach((gid, list) -> groups.add(new FoodDetailResponse.OptionGroupDto(
                gid, groupNames.get(gid), firstOfGroup.get(gid).getOptionGroup().getSelectionType(), list)));

        return new FoodDetailResponse(food.getId(), food.getName(), food.getPrice(), food.getImage(),
                food.getDescription(), food.getEstimatedCookingTime(), isFoodAvailable(recipes), groups);
    }

    // ------------------------------------------------------------------ còn / hết hàng

    /** Món còn hàng nếu kho đủ cho 1 phần theo công thức gốc. Món chưa có công thức được coi là còn. */
    private boolean isFoodAvailable(List<Recipe> recipes) {
        if (recipes == null || recipes.isEmpty()) return true;
        List<IngredientNeed> needs = requirementCalculator.calculate(recipes, 1, List.of());
        return requirementCalculator.isSufficient(needs, new HashMap<>());
    }

    /** Combo hết hàng nếu chỉ cần MỘT món con hết (có tính cộng dồn nguyên liệu dùng chung giữa các món con). */
    private boolean isComboAvailable(List<ComboItem> items, Map<Long, List<Recipe>> recipesByFood) {
        Map<Long, BigDecimal> used = new HashMap<>();
        for (ComboItem ci : items) {
            List<Recipe> recipes = recipesByFood.get(ci.getFood().getId());
            if (recipes == null || recipes.isEmpty()) continue;
            int qty = ci.getQuantity() == null ? 1 : ci.getQuantity();
            List<IngredientNeed> needs = requirementCalculator.calculate(recipes, qty, List.of());
            if (!requirementCalculator.isSufficient(needs, used)) return false;
            requirementCalculator.accumulate(needs, used);
        }
        return true;
    }
}
