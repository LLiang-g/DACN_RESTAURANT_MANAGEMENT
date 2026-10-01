package com.sccgroup.restaurant_management.admin.controller;

import com.sccgroup.restaurant_management.admin.dto.AdminDtos;
import com.sccgroup.restaurant_management.admin.service.AdminDataService;
import com.sccgroup.restaurant_management.common.security.AppUserPrincipal;
import com.sccgroup.restaurant_management.domain.entity.account.*;
import com.sccgroup.restaurant_management.domain.entity.floor.RestaurantTable;
import com.sccgroup.restaurant_management.domain.entity.inventory.Ingredient;
import com.sccgroup.restaurant_management.domain.entity.inventory.Recipe;
import com.sccgroup.restaurant_management.domain.entity.menu.*;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin")
public class AdminDataController {
    private final AdminDataService service;
    public AdminDataController(AdminDataService service) { this.service = service; }

    @GetMapping("/kitchen-stations") public List<KitchenStation> stations() { return service.stations(); }
    @GetMapping("/kitchen-stations/{id}") public KitchenStation station(@PathVariable Long id) { return service.station(id); }
    @PostMapping("/kitchen-stations") @ResponseStatus(HttpStatus.CREATED) public KitchenStation createStation(@RequestBody AdminDtos.StationRequest r, Authentication a) { return service.createStation(r, actor(a)); }
    @PutMapping("/kitchen-stations/{id}") public KitchenStation updateStation(@PathVariable Long id, @RequestBody AdminDtos.StationRequest r, Authentication a) { return service.updateStation(id, r, actor(a)); }
    @DeleteMapping("/kitchen-stations/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) public void deleteStation(@PathVariable Long id, Authentication a) { service.deleteStation(id, actor(a)); }

    @GetMapping("/categories") public List<Category> categories() { return service.categories(); }
    @GetMapping("/categories/{id}") public Category category(@PathVariable Long id) { return service.category(id); }
    @PostMapping("/categories") @ResponseStatus(HttpStatus.CREATED) public Category createCategory(@RequestBody AdminDtos.CategoryRequest r, Authentication a) { return service.createCategory(r, actor(a)); }
    @PutMapping("/categories/{id}") public Category updateCategory(@PathVariable Long id, @RequestBody AdminDtos.CategoryRequest r, Authentication a) { return service.updateCategory(id, r, actor(a)); }
    @DeleteMapping("/categories/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) public void deleteCategory(@PathVariable Long id, Authentication a) { service.deleteCategory(id, actor(a)); }

    @GetMapping("/foods") public List<Food> foods() { return service.foods(); }
    @GetMapping("/foods/{id}") public Food food(@PathVariable Long id) { return service.food(id); }
    @PostMapping("/foods") @ResponseStatus(HttpStatus.CREATED) public Food createFood(@RequestBody AdminDtos.FoodRequest r, Authentication a) { return service.createFood(r, actor(a)); }
    @PutMapping("/foods/{id}") public Food updateFood(@PathVariable Long id, @RequestBody AdminDtos.FoodRequest r, Authentication a) { return service.updateFood(id, r, actor(a)); }
    @DeleteMapping("/foods/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) public void deleteFood(@PathVariable Long id, Authentication a) { service.deleteFood(id, actor(a)); }

    @GetMapping("/ingredients") public List<Ingredient> ingredients() { return service.ingredients(); }
    @GetMapping("/ingredients/{id}") public Ingredient ingredient(@PathVariable Long id) { return service.ingredient(id); }
    @PostMapping("/ingredients") @ResponseStatus(HttpStatus.CREATED) public Ingredient createIngredient(@RequestBody AdminDtos.IngredientRequest r, Authentication a) { return service.createIngredient(r, actor(a)); }
    @PutMapping("/ingredients/{id}") public Ingredient updateIngredient(@PathVariable Long id, @RequestBody AdminDtos.IngredientRequest r, Authentication a) { return service.updateIngredient(id, r, actor(a)); }
    @DeleteMapping("/ingredients/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) public void deleteIngredient(@PathVariable Long id, Authentication a) { service.deleteIngredient(id, actor(a)); }

    @GetMapping("/foods/{foodId}/recipes") public List<Recipe> recipes(@PathVariable Long foodId) { return service.recipes(foodId); }
    @PostMapping("/recipes") @ResponseStatus(HttpStatus.CREATED) public Recipe createRecipe(@RequestBody AdminDtos.RecipeRequest r, Authentication a) { return service.createRecipe(r, actor(a)); }
    @PutMapping("/recipes/{id}") public Recipe updateRecipe(@PathVariable Long id, @RequestBody AdminDtos.RecipeRequest r, Authentication a) { return service.updateRecipe(id, r, actor(a)); }
    @DeleteMapping("/recipes/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) public void deleteRecipe(@PathVariable Long id, Authentication a) { service.deleteRecipe(id, actor(a)); }

    @GetMapping("/stock-transactions") public List<StockTransaction> stockTransactions() { return service.stockTransactions(); }
    @PostMapping("/stock-transactions") @ResponseStatus(HttpStatus.CREATED) public StockTransaction createStockTransaction(@RequestBody AdminDtos.StockRequest r, Authentication a) { return service.createStockTransaction(r, actor(a)); }

    @GetMapping("/option-groups") public List<OptionGroup> optionGroups() { return service.optionGroups(); }
    @GetMapping("/option-groups/{id}") public OptionGroup optionGroup(@PathVariable Long id) { return service.optionGroup(id); }
    @PostMapping("/option-groups") @ResponseStatus(HttpStatus.CREATED) public OptionGroup createOptionGroup(@RequestBody AdminDtos.OptionGroupRequest r, Authentication a) { return service.createOptionGroup(r, actor(a)); }
    @PutMapping("/option-groups/{id}") public OptionGroup updateOptionGroup(@PathVariable Long id, @RequestBody AdminDtos.OptionGroupRequest r, Authentication a) { return service.updateOptionGroup(id, r, actor(a)); }
    @DeleteMapping("/option-groups/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) public void deleteOptionGroup(@PathVariable Long id, Authentication a) { service.deleteOptionGroup(id, actor(a)); }

    @GetMapping("/options") public List<Option> options() { return service.options(); }
    @GetMapping("/options/{id}") public Option option(@PathVariable Long id) { return service.option(id); }
    @PostMapping("/options") @ResponseStatus(HttpStatus.CREATED) public Option createOption(@RequestBody AdminDtos.OptionRequest r, Authentication a) { return service.createOption(r, actor(a)); }
    @PutMapping("/options/{id}") public Option updateOption(@PathVariable Long id, @RequestBody AdminDtos.OptionRequest r, Authentication a) { return service.updateOption(id, r, actor(a)); }
    @DeleteMapping("/options/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) public void deleteOption(@PathVariable Long id, Authentication a) { service.deleteOption(id, actor(a)); }

    @GetMapping("/combos") public List<Combo> combos() { return service.combos(); }
    @GetMapping("/combos/{id}") public Combo combo(@PathVariable Long id) { return service.combo(id); }
    @PostMapping("/combos") @ResponseStatus(HttpStatus.CREATED) public Combo createCombo(@RequestBody AdminDtos.ComboRequest r, Authentication a) { return service.createCombo(r, actor(a)); }
    @PutMapping("/combos/{id}") public Combo updateCombo(@PathVariable Long id, @RequestBody AdminDtos.ComboRequest r, Authentication a) { return service.updateCombo(id, r, actor(a)); }
    @DeleteMapping("/combos/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) public void deleteCombo(@PathVariable Long id, Authentication a) { service.deleteCombo(id, actor(a)); }
    @GetMapping("/combos/{comboId}/items") public List<ComboItem> comboItems(@PathVariable Long comboId) { return service.comboItems(comboId); }
    @PostMapping("/combos/{comboId}/items") @ResponseStatus(HttpStatus.CREATED) public ComboItem addComboItem(@PathVariable Long comboId, @RequestBody AdminDtos.ComboItemRequest r, Authentication a) { return service.addComboItem(comboId, r, actor(a)); }
    @DeleteMapping("/combos/{comboId}/items/{foodId}") @ResponseStatus(HttpStatus.NO_CONTENT) public void deleteComboItem(@PathVariable Long comboId, @PathVariable Long foodId, Authentication a) { service.deleteComboItem(comboId, foodId, actor(a)); }

    @GetMapping("/tables") public List<RestaurantTable> tables() { return service.restaurantTables(); }
    @GetMapping("/tables/{id}") public RestaurantTable table(@PathVariable Long id) { return service.restaurantTable(id); }
    @PostMapping("/tables") @ResponseStatus(HttpStatus.CREATED) public RestaurantTable createTable(@RequestBody AdminDtos.TableRequest r, Authentication a) { return service.createTable(r, actor(a)); }
    @PutMapping("/tables/{id}") public RestaurantTable updateTable(@PathVariable Long id, @RequestBody AdminDtos.TableRequest r, Authentication a) { return service.updateTable(id, r, actor(a)); }
    @DeleteMapping("/tables/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) public void deleteTable(@PathVariable Long id, Authentication a) { service.deleteTable(id, actor(a)); }

    @GetMapping("/staff-accounts") public List<AdminDtos.AccountResponse> staffAccounts() { return service.staffAccounts().stream().map(x -> new AdminDtos.AccountResponse(x.getId(), x.getUsername(), x.getRole(), null)).toList(); }
    @PostMapping("/staff-accounts") @ResponseStatus(HttpStatus.CREATED) public AdminDtos.AccountResponse createStaff(@RequestBody AdminDtos.StaffAccountRequest r, Authentication a) { StaffAccount x = service.createStaffAccount(r, actor(a)); return new AdminDtos.AccountResponse(x.getId(), x.getUsername(), x.getRole(), null); }
    @PutMapping("/staff-accounts/{id}") public AdminDtos.AccountResponse updateStaff(@PathVariable Long id, @RequestBody AdminDtos.StaffAccountRequest r, Authentication a) { StaffAccount x = service.updateStaffAccount(id, r, actor(a)); return new AdminDtos.AccountResponse(x.getId(), x.getUsername(), x.getRole(), null); }
    @DeleteMapping("/staff-accounts/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) public void deleteStaff(@PathVariable Long id, Authentication a) { service.deleteStaffAccount(id, actor(a)); }
    @GetMapping("/kitchen-accounts") public List<AdminDtos.AccountResponse> kitchenAccounts() { return service.kitchenAccounts().stream().map(x -> new AdminDtos.AccountResponse(x.getId(), x.getUsername(), null, x.getKitchenStation().getId())).toList(); }
    @PostMapping("/kitchen-accounts") @ResponseStatus(HttpStatus.CREATED) public AdminDtos.AccountResponse createKitchen(@RequestBody AdminDtos.KitchenAccountRequest r, Authentication a) { KitchenAccount x = service.createKitchenAccount(r, actor(a)); return new AdminDtos.AccountResponse(x.getId(), x.getUsername(), null, x.getKitchenStation().getId()); }
    @PutMapping("/kitchen-accounts/{id}") public AdminDtos.AccountResponse updateKitchen(@PathVariable Long id, @RequestBody AdminDtos.KitchenAccountRequest r, Authentication a) { KitchenAccount x = service.updateKitchenAccount(id, r, actor(a)); return new AdminDtos.AccountResponse(x.getId(), x.getUsername(), null, x.getKitchenStation().getId()); }
    @DeleteMapping("/kitchen-accounts/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) public void deleteKitchen(@PathVariable Long id, Authentication a) { service.deleteKitchenAccount(id, actor(a)); }

    private AdminDataService.Actor actor(Authentication authentication) {
        AppUserPrincipal principal = (AppUserPrincipal) authentication.getPrincipal();
        return new AdminDataService.Actor(principal.getAccountId(), AccountType.valueOf(principal.getAccountType()));
    }
}
