// Public fixture identities. Password is for the disposable test stack only.
module.exports = Object.freeze({
  marker: 'E2E FOUNDATION v1 HOT', password: 'E2eOnly!2026',
  users: {admin:'admin.e2e',pos:'pos.e2e',hot:'kitchen.hot.e2e',bar:'kitchen.bar.e2e'},
  ids: {hotStation:900001,barStation:900002,hotCategory:900001,barCategory:900002,
    mainFood:900001,drink:900002,soldOutFood:900003,mainIngredient:900001,
    drinkIngredient:900002,emptyIngredient:900003,optionGroup:900001,extraOption:900001,
    combo:900001,table:900002,otherTable:900003,concurrentTable:900004},
  amounts: {main:20000,drink:10000,extra:5000,combo:25000},
});
