package com.sccgroup.restaurant_management.admin.service;

import com.sccgroup.restaurant_management.admin.dto.AdminDtos;
import com.sccgroup.restaurant_management.common.exception.BusinessException;
import com.sccgroup.restaurant_management.common.exception.ResourceNotFoundException;
import com.sccgroup.restaurant_management.common.security.AppUserPrincipal;
import com.sccgroup.restaurant_management.domain.entity.account.*;
import com.sccgroup.restaurant_management.domain.entity.floor.RestaurantTable;
import com.sccgroup.restaurant_management.domain.entity.inventory.Ingredient;
import com.sccgroup.restaurant_management.domain.entity.inventory.Recipe;
import com.sccgroup.restaurant_management.domain.entity.menu.*;
import com.sccgroup.restaurant_management.domain.repository.*;
import com.sccgroup.restaurant_management.domain.repository.account.KitchenAccountRepository;
import com.sccgroup.restaurant_management.kds.repository.KitchenStationRepository;
import jakarta.transaction.Transactional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class AdminDataService {
    private final KitchenStationRepository stations;
    private final CategoryRepository categories;
    private final FoodRepository foods;
    private final IngredientRepository ingredients;
    private final RecipeRepository recipes;
    private final StockTransactionRepository stockTransactions;
    private final OptionGroupRepository optionGroups;
    private final OptionRepository options;
    private final ComboRepository combos;
    private final ComboItemRepository comboItems;
    private final RestaurantTableRepository tables;
    private final AdminStaffAccountRepository staffAccounts;
    private final KitchenAccountRepository kitchenAccounts;
    private final ActivityLogRepository activityLogs;
    private final PasswordEncoder passwordEncoder;

    public AdminDataService(KitchenStationRepository stations, CategoryRepository categories, FoodRepository foods,
                            IngredientRepository ingredients, RecipeRepository recipes,
                            StockTransactionRepository stockTransactions, OptionGroupRepository optionGroups,
                            OptionRepository options, ComboRepository combos, ComboItemRepository comboItems,
                            RestaurantTableRepository tables, AdminStaffAccountRepository staffAccounts,
                            KitchenAccountRepository kitchenAccounts, ActivityLogRepository activityLogs,
                            PasswordEncoder passwordEncoder) {
        this.stations = stations; this.categories = categories; this.foods = foods; this.ingredients = ingredients;
        this.recipes = recipes; this.stockTransactions = stockTransactions; this.optionGroups = optionGroups;
        this.options = options; this.combos = combos; this.comboItems = comboItems; this.tables = tables;
        this.staffAccounts = staffAccounts; this.kitchenAccounts = kitchenAccounts; this.activityLogs = activityLogs;
        this.passwordEncoder = passwordEncoder;
    }

    public List<KitchenStation> stations() { return stations.findAll(); }
    public KitchenStation station(Long id) { return stations.findById(id).orElseThrow(() -> missing("Kitchen station", id)); }
    @Transactional public KitchenStation createStation(AdminDtos.StationRequest request, Actor actor) {
        requireText(request.name(), "Station name");
        KitchenStation saved = stations.save(new KitchenStation(request.name().trim()));
        log(actor, "create", "kitchen_station", saved.getId(), saved.getName()); return saved;
    }
    @Transactional public KitchenStation updateStation(Long id, AdminDtos.StationRequest request, Actor actor) {
        KitchenStation station = station(id); requireText(request.name(), "Station name"); station.setName(request.name().trim());
        log(actor, "update", "kitchen_station", id, station.getName()); return stations.save(station);
    }
    @Transactional public void deleteStation(Long id, Actor actor) { stations.delete(station(id)); log(actor, "delete", "kitchen_station", id, null); }

    public List<Category> categories() { return categories.findAll(); }
    public Category category(Long id) { return categories.findById(id).orElseThrow(() -> missing("Category", id)); }
    @Transactional public Category createCategory(AdminDtos.CategoryRequest request, Actor actor) {
        requireText(request.name(), "Category name"); Category saved = categories.save(new Category(request.name().trim(), station(request.stationId())));
        log(actor, "create", "category", saved.getId(), saved.getName()); return saved;
    }
    @Transactional public Category updateCategory(Long id, AdminDtos.CategoryRequest request, Actor actor) {
        Category category = category(id); requireText(request.name(), "Category name"); category.setName(request.name().trim()); category.setKitchenStation(station(request.stationId()));
        log(actor, "update", "category", id, category.getName()); return categories.save(category);
    }
    @Transactional public void deleteCategory(Long id, Actor actor) { categories.delete(category(id)); log(actor, "delete", "category", id, null); }

    public List<Food> foods() { return foods.findAll(); }
    public Food food(Long id) { return foods.findById(id).orElseThrow(() -> missing("Food", id)); }
    @Transactional public Food createFood(AdminDtos.FoodRequest request, Actor actor) {
        validateFood(request); Food saved = foods.save(new Food(category(request.categoryId()), request.name().trim(), request.price()));
        saved.setImage(request.image()); saved.setDescription(request.description()); saved.setEstimatedCookingTime(request.estimatedCookingTime());
        log(actor, "create", "food", saved.getId(), saved.getName()); return saved;
    }
    @Transactional public Food updateFood(Long id, AdminDtos.FoodRequest request, Actor actor) {
        validateFood(request); Food food = food(id); food.setCategory(category(request.categoryId())); food.setName(request.name().trim()); food.setPrice(request.price());
        food.setImage(request.image()); food.setDescription(request.description()); food.setEstimatedCookingTime(request.estimatedCookingTime());
        log(actor, "update", "food", id, food.getName()); return foods.save(food);
    }
    @Transactional public void deleteFood(Long id, Actor actor) { foods.delete(food(id)); log(actor, "delete", "food", id, null); }

    public List<Ingredient> ingredients() { return ingredients.findAll(); }
    public Ingredient ingredient(Long id) { return ingredients.findById(id).orElseThrow(() -> missing("Ingredient", id)); }
    @Transactional public Ingredient createIngredient(AdminDtos.IngredientRequest request, Actor actor) {
        validateIngredient(request); Ingredient saved = ingredients.save(new Ingredient(request.name().trim(), request.unit().trim(), request.stockQuantity(), request.minThreshold()));
        log(actor, "create", "ingredient", saved.getId(), saved.getName()); return saved;
    }
    @Transactional public Ingredient updateIngredient(Long id, AdminDtos.IngredientRequest request, Actor actor) {
        validateIngredient(request); Ingredient item = ingredient(id); item.setName(request.name().trim()); item.setUnit(request.unit().trim()); item.setStockQuantity(request.stockQuantity()); item.setMinThreshold(request.minThreshold());
        log(actor, "update", "ingredient", id, item.getName()); return ingredients.save(item);
    }
    @Transactional public void deleteIngredient(Long id, Actor actor) { ingredients.delete(ingredient(id)); log(actor, "delete", "ingredient", id, null); }

    public List<Recipe> recipes(Long foodId) { food(foodId); return recipes.findByFoodId(foodId); }
    @Transactional public Recipe createRecipe(AdminDtos.RecipeRequest request, Actor actor) {
        positive(request.quantityRequired(), "Recipe quantity"); if (recipes.existsByFoodIdAndIngredientId(request.foodId(), request.ingredientId())) throw new BusinessException("Recipe already exists for this food and ingredient");
        Recipe saved = recipes.save(new Recipe(food(request.foodId()), ingredient(request.ingredientId()), request.quantityRequired())); log(actor, "create", "recipe", saved.getId(), null); return saved;
    }
    @Transactional public Recipe updateRecipe(Long id, AdminDtos.RecipeRequest request, Actor actor) {
        positive(request.quantityRequired(), "Recipe quantity"); Recipe recipe = recipes.findById(id).orElseThrow(() -> missing("Recipe", id)); recipe.setQuantityRequired(request.quantityRequired()); log(actor, "update", "recipe", id, null); return recipes.save(recipe);
    }
    @Transactional public void deleteRecipe(Long id, Actor actor) { if (!recipes.existsById(id)) throw missing("Recipe", id); recipes.deleteById(id); log(actor, "delete", "recipe", id, null); }

    public List<StockTransaction> stockTransactions() { return stockTransactions.findAll(); }
    @Transactional public StockTransaction createStockTransaction(AdminDtos.StockRequest request, Actor actor) {
        positive(request.quantity(), "Stock quantity"); Ingredient ingredient = ingredient(request.ingredientId()); BigDecimal delta = switch (request.type()) {
            case IMPORT -> request.quantity(); case EXPORT -> request.quantity().negate(); case ADJUST -> request.quantity();
        }; BigDecimal next = ingredient.getStockQuantity().add(delta); if (next.signum() < 0) throw new BusinessException("Insufficient stock");
        ingredient.setStockQuantity(next); ingredients.save(ingredient); StockTransaction saved = stockTransactions.save(new StockTransaction(ingredient, request.type(), request.quantity(), request.note(), LocalDateTime.now()));
        log(actor, request.type().name().toLowerCase(), "ingredient", ingredient.getId(), request.note()); return saved;
    }

    public List<OptionGroup> optionGroups() { return optionGroups.findAll(); }
    public OptionGroup optionGroup(Long id) { return optionGroups.findById(id).orElseThrow(() -> missing("Option group", id)); }
    @Transactional public OptionGroup createOptionGroup(AdminDtos.OptionGroupRequest request, Actor actor) { requireText(request.name(), "Option group name"); OptionGroup saved = optionGroups.save(new OptionGroup(request.name().trim(), request.selectionType())); log(actor, "create", "option_group", saved.getId(), saved.getName()); return saved; }
    @Transactional public OptionGroup updateOptionGroup(Long id, AdminDtos.OptionGroupRequest request, Actor actor) { OptionGroup item = optionGroup(id); requireText(request.name(), "Option group name"); item.setName(request.name().trim()); item.setSelectionType(request.selectionType()); log(actor, "update", "option_group", id, item.getName()); return optionGroups.save(item); }
    @Transactional public void deleteOptionGroup(Long id, Actor actor) { optionGroups.delete(optionGroup(id)); log(actor, "delete", "option_group", id, null); }

    public List<Option> options() { return options.findAll(); }
    public Option option(Long id) { return options.findById(id).orElseThrow(() -> missing("Option", id)); }
    @Transactional public Option createOption(AdminDtos.OptionRequest request, Actor actor) { validateOption(request); Option saved = options.save(optionEntity(request)); log(actor, "create", "option", saved.getId(), saved.getName()); return saved; }
    @Transactional public Option updateOption(Long id, AdminDtos.OptionRequest request, Actor actor) { validateOption(request); Option item = option(id); item.setFood(food(request.foodId())); item.setName(request.name().trim()); item.setOptionGroup(optionGroup(request.groupId())); Option replacement = optionEntity(request); item.setIngredient(replacement.getIngredient()); item.setAdjustAmount(request.adjustAmount()); item.setAdjustType(request.adjustType()); item.setPriceDelta(request.priceDelta()); item.setScaleFactor(request.scaleFactor()); log(actor, "update", "option", id, request.name()); return options.save(item); }
    private Option optionEntity(AdminDtos.OptionRequest r) { Option item = new Option(food(r.foodId()), r.name().trim(), optionGroup(r.groupId())); if (r.ingredientId() != null) item.setIngredient(ingredient(r.ingredientId())); item.setAdjustAmount(r.adjustAmount()); item.setAdjustType(r.adjustType()); item.setPriceDelta(r.priceDelta()); item.setScaleFactor(r.scaleFactor()); return item; }
    @Transactional public void deleteOption(Long id, Actor actor) { options.delete(option(id)); log(actor, "delete", "option", id, null); }

    public List<Combo> combos() { return combos.findAll(); }
    public Combo combo(Long id) { return combos.findById(id).orElseThrow(() -> missing("Combo", id)); }
    @Transactional public Combo createCombo(AdminDtos.ComboRequest request, Actor actor) { validateDiscount(request); Combo saved = combos.save(new Combo(request.name().trim(), request.discountType(), request.discountValue())); log(actor, "create", "combo", saved.getId(), saved.getName()); return saved; }
    @Transactional public Combo updateCombo(Long id, AdminDtos.ComboRequest request, Actor actor) { validateDiscount(request); Combo item = combo(id); item.setName(request.name().trim()); item.setDiscountType(request.discountType()); item.setDiscountValue(request.discountValue()); log(actor, "update", "combo", id, item.getName()); return combos.save(item); }
    @Transactional public void deleteCombo(Long id, Actor actor) { combos.delete(combo(id)); log(actor, "delete", "combo", id, null); }
    public List<ComboItem> comboItems(Long comboId) { combo(comboId); return comboItems.findByComboId(comboId); }
    @Transactional public ComboItem addComboItem(Long comboId, AdminDtos.ComboItemRequest request, Actor actor) { if (request.quantity() == null || request.quantity() < 1) throw new BusinessException("Quantity must be positive"); ComboItem item = comboItems.save(new ComboItem(combo(comboId), food(request.foodId()), request.quantity())); log(actor, "create", "combo_item", null, null); return item; }
    @Transactional public void deleteComboItem(Long comboId, Long foodId, Actor actor) { comboItems.deleteById(new ComboItemId(comboId, foodId)); log(actor, "delete", "combo_item", null, null); }

    public List<RestaurantTable> restaurantTables() { return tables.findAll(); }
    public RestaurantTable restaurantTable(Long id) { return tables.findById(id).orElseThrow(() -> missing("Table", id)); }
    @Transactional public RestaurantTable createTable(AdminDtos.TableRequest request, Actor actor) { requireText(request.floor(), "Floor"); requireText(request.tableNumber(), "Table number"); RestaurantTable saved = tables.save(new RestaurantTable(request.floor().trim(), request.tableNumber().trim(), request.status())); log(actor, "create", "table", saved.getId(), saved.getTableNumber()); return saved; }
    @Transactional public RestaurantTable updateTable(Long id, AdminDtos.TableRequest request, Actor actor) { RestaurantTable item = restaurantTable(id); requireText(request.floor(), "Floor"); requireText(request.tableNumber(), "Table number"); item.setFloor(request.floor().trim()); item.setTableNumber(request.tableNumber().trim()); item.setStatus(request.status()); log(actor, "update", "table", id, item.getTableNumber()); return tables.save(item); }
    @Transactional public void deleteTable(Long id, Actor actor) { tables.delete(restaurantTable(id)); log(actor, "delete", "table", id, null); }

    public List<StaffAccount> staffAccounts() { return staffAccounts.findAll(); }
    @Transactional public StaffAccount createStaffAccount(AdminDtos.StaffAccountRequest request, Actor actor) { requireText(request.username(), "Username"); requireText(request.password(), "Password"); if (request.role() == null) throw new BusinessException("Role is required"); StaffAccount saved = staffAccounts.save(new StaffAccount(request.username().trim(), passwordEncoder.encode(request.password()), request.role())); log(actor, "create", "staff_account", saved.getId(), saved.getUsername()); return saved; }
    @Transactional public StaffAccount updateStaffAccount(Long id, AdminDtos.StaffAccountRequest request, Actor actor) { StaffAccount item = staffAccounts.findById(id).orElseThrow(() -> missing("Staff account", id)); requireText(request.username(), "Username"); item.setUsername(request.username().trim()); item.setRole(request.role()); if (request.password() != null && !request.password().isBlank()) item.setPasswordHash(passwordEncoder.encode(request.password())); log(actor, "update", "staff_account", id, item.getUsername()); return staffAccounts.save(item); }
    @Transactional public void deleteStaffAccount(Long id, Actor actor) { if (!staffAccounts.existsById(id)) throw missing("Staff account", id); staffAccounts.deleteById(id); log(actor, "delete", "staff_account", id, null); }
    public List<KitchenAccount> kitchenAccounts() { return kitchenAccounts.findAll(); }
    @Transactional public KitchenAccount createKitchenAccount(AdminDtos.KitchenAccountRequest request, Actor actor) { requireText(request.username(), "Username"); requireText(request.password(), "Password"); KitchenAccount saved = kitchenAccounts.save(new KitchenAccount(request.username().trim(), passwordEncoder.encode(request.password()), station(request.stationId()))); log(actor, "create", "kitchen_account", saved.getId(), saved.getUsername()); return saved; }
    @Transactional public KitchenAccount updateKitchenAccount(Long id, AdminDtos.KitchenAccountRequest request, Actor actor) { KitchenAccount item = kitchenAccounts.findById(id).orElseThrow(() -> missing("Kitchen account", id)); requireText(request.username(), "Username"); item.setUsername(request.username().trim()); item.setKitchenStation(station(request.stationId())); if (request.password() != null && !request.password().isBlank()) item.setPasswordHash(passwordEncoder.encode(request.password())); log(actor, "update", "kitchen_account", id, item.getUsername()); return kitchenAccounts.save(item); }
    @Transactional public void deleteKitchenAccount(Long id, Actor actor) { if (!kitchenAccounts.existsById(id)) throw missing("Kitchen account", id); kitchenAccounts.deleteById(id); log(actor, "delete", "kitchen_account", id, null); }

    private void validateFood(AdminDtos.FoodRequest r) { requireText(r.name(), "Food name"); positive(r.price(), "Food price"); if (r.estimatedCookingTime() != null && r.estimatedCookingTime() < 0) throw new BusinessException("Cooking time cannot be negative"); }
    private void validateIngredient(AdminDtos.IngredientRequest r) { requireText(r.name(), "Ingredient name"); requireText(r.unit(), "Ingredient unit"); nonNegative(r.stockQuantity(), "Stock quantity"); nonNegative(r.minThreshold(), "Minimum threshold"); }
    private void validateOption(AdminDtos.OptionRequest r) { requireText(r.name(), "Option name"); if (r.adjustAmount() != null) positive(r.adjustAmount(), "Adjust amount"); if (r.adjustAmount() != null && r.adjustType() == null) throw new BusinessException("Adjust type is required with adjust amount"); if (r.scaleFactor() != null) positive(r.scaleFactor(), "Scale factor"); }
    private void validateDiscount(AdminDtos.ComboRequest r) { requireText(r.name(), "Combo name"); nonNegative(r.discountValue(), "Discount value"); if (r.discountType() == DiscountType.PERCENT && r.discountValue().compareTo(BigDecimal.valueOf(100)) > 0) throw new BusinessException("Percent discount cannot exceed 100"); }
    private void requireText(String value, String field) { if (value == null || value.isBlank()) throw new BusinessException(field + " is required"); }
    private void positive(BigDecimal value, String field) { if (value == null || value.signum() <= 0) throw new BusinessException(field + " must be positive"); }
    private void nonNegative(BigDecimal value, String field) { if (value == null || value.signum() < 0) throw new BusinessException(field + " cannot be negative"); }
    private ResourceNotFoundException missing(String type, Long id) { return new ResourceNotFoundException(type + " not found: " + id); }
    private void log(Actor actor, String action, String targetType, Long targetId, String detail) { if (actor != null) activityLogs.save(new ActivityLog(actor.accountId(), actor.accountType(), action, targetType, targetId, detail, LocalDateTime.now())); }
    public record Actor(Long accountId, AccountType accountType) {}
}
