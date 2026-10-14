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
import com.sccgroup.restaurant_management.domain.service.StockReservationService;
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
    private final StockReservationService reservationService;

    public CustomerMenuService(RestaurantTableRepository tableRepository,
                               FoodRepository foodRepository,
                               OptionRepository optionRepository,
                               ComboRepository comboRepository,
                               ComboItemRepository comboItemRepository,
                               RecipeRepository recipeRepository,
                               IngredientRequirementCalculator requirementCalculator,
                               ComboPriceCalculator comboPriceCalculator,
                               StockReservationService reservationService) {
        this.tableRepository = tableRepository;
        this.foodRepository = foodRepository;
        this.optionRepository = optionRepository;
        this.comboRepository = comboRepository;
        this.comboItemRepository = comboItemRepository;
        this.recipeRepository = recipeRepository;
        this.requirementCalculator = requirementCalculator;
        this.comboPriceCalculator = comboPriceCalculator;
        this.reservationService = reservationService;
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
        Map<Long, BigDecimal> reserved = reservationService.reservedByIngredient();

        Set<Long> foodIdsWithOptions = new HashSet<>();
        if (!foods.isEmpty()) {
            List<Long> foodIds = foods.stream().map(Food::getId).toList();
            for (Option option : optionRepository.findByFoodIdIn(foodIds)) {
                foodIdsWithOptions.add(option.getFood().getId());
            }
        }

        // ---- Danh mục món (bỏ danh mục rỗng) ----
        Map<Long, String> categoryNames = new LinkedHashMap<>();
        Map<Long, List<MenuResponse.FoodDto>> foodsByCategory = new LinkedHashMap<>();
        for (Food food : foods) {
            Category category = food.getCategory();
            categoryNames.putIfAbsent(category.getId(), category.getName());
            Integer portions = foodPortions(recipesByFood.get(food.getId()), reserved);
            foodsByCategory.computeIfAbsent(category.getId(), key -> new ArrayList<>()).add(new MenuResponse.FoodDto(
                    food.getId(), food.getName(), food.getPrice(), food.getImage(), food.getDescription(),
                    food.getEstimatedCookingTime(),
                    portions == null || portions > 0, portions,
                    foodIdsWithOptions.contains(food.getId())));
        }
        List<MenuResponse.CategoryDto> categories = new ArrayList<>();
        foodsByCategory.forEach((categoryId, foodDtos) ->
                categories.add(new MenuResponse.CategoryDto(categoryId, categoryNames.get(categoryId), foodDtos)));

        // ---- Combo ----
        Map<Long, List<ComboItem>> itemsByCombo = new HashMap<>();
        for (ComboItem comboItem : comboItemRepository.findAllWithFood()) {
            itemsByCombo.computeIfAbsent(comboItem.getCombo().getId(), key -> new ArrayList<>()).add(comboItem);
        }
        List<MenuResponse.ComboDto> combos = new ArrayList<>();
        for (Combo combo : comboRepository.findAll(Sort.by("id"))) {
            List<ComboItem> items = itemsByCombo.getOrDefault(combo.getId(), List.of());
            if (items.isEmpty()) continue; // combo chưa có món con thì không thể đặt
            items.sort(Comparator.comparing(comboItem -> comboItem.getFood().getId()));

            List<MenuResponse.ComboItemDto> itemDtos = items.stream()
                    .map(comboItem -> new MenuResponse.ComboItemDto(
                            comboItem.getFood().getId(), comboItem.getFood().getName(), comboItem.getQuantity(),
                            foodIdsWithOptions.contains(comboItem.getFood().getId())))
                    .toList();

            Integer comboPortions = comboPortions(items, recipesByFood, reserved);
            combos.add(new MenuResponse.ComboDto(
                    combo.getId(), combo.getName(),
                    comboPriceCalculator.price(combo, items),
                    comboPriceCalculator.originalPrice(items),
                    comboPortions == null || comboPortions > 0, comboPortions,
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
        for (Option option : options) {
            Long groupId = option.getOptionGroup().getId();
            groupNames.putIfAbsent(groupId, option.getOptionGroup().getName());
            firstOfGroup.putIfAbsent(groupId, option);
            BigDecimal delta = option.getPriceDelta() == null ? BigDecimal.ZERO : option.getPriceDelta();
            optionsByGroup.computeIfAbsent(groupId, key -> new ArrayList<>())
                    .add(new FoodDetailResponse.OptionDto(option.getId(), option.getName(), delta));
        }
        List<FoodDetailResponse.OptionGroupDto> groups = new ArrayList<>();
        optionsByGroup.forEach((groupId, optionDtos) -> groups.add(new FoodDetailResponse.OptionGroupDto(
                groupId, groupNames.get(groupId), firstOfGroup.get(groupId).getOptionGroup().getSelectionType(), optionDtos)));

        Integer portions = foodPortions(recipes, reservationService.reservedByIngredient());
        return new FoodDetailResponse(food.getId(), food.getName(), food.getPrice(), food.getImage(),
                food.getDescription(), food.getEstimatedCookingTime(),
                portions == null || portions > 0, portions, groups);
    }

    // ------------------------------------------------------------------ còn / hết hàng

    /**
     * Số suất còn làm được = min theo nguyên liệu của (tồn kho − phần đang giữ chỗ bởi các đơn chưa tới bếp) / định lượng.
     * null nếu món chưa có công thức (không giới hạn).
     */
    private Integer foodPortions(List<Recipe> recipes, Map<Long, BigDecimal> reserved) {
        if (recipes == null || recipes.isEmpty()) return null;
        return requirementCalculator.maxPortions(requirementCalculator.calculate(recipes, 1, List.of()), reserved);
    }

    /** Số suất combo = tính trên nhu cầu gộp của mọi món con, nên một món con hết thì cả combo hết. */
    private Integer comboPortions(List<ComboItem> items, Map<Long, List<Recipe>> recipesByFood, Map<Long, BigDecimal> reserved) {
        List<IngredientNeed> needs = new ArrayList<>();
        for (ComboItem comboItem : items) {
            List<Recipe> recipes = recipesByFood.get(comboItem.getFood().getId());
            if (recipes == null || recipes.isEmpty()) continue;
            needs.addAll(requirementCalculator.calculate(recipes, comboItem.getQuantity() == null ? 1 : comboItem.getQuantity(), List.of()));
        }
        return requirementCalculator.maxPortions(needs, reserved);
    }
}
