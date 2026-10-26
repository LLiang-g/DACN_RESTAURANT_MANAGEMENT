"""Regenerate importable Postman files and verify coverage against Spring controllers."""
import json, re
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
OUT = Path(__file__).resolve().parent
folders=[]
def folder(name):
    items=[]; folders.append({'name':name,'item':items}); return items
def req(items,name,method,path,status=200,body=None,token='adminToken',save=None,check='',route=None):
    script=[f'pm.test("HTTP {status}", () => pm.response.to.have.status({status}));']
    if status not in (204,) and (save or check):
        script.append('const result = pm.response.json();')
    if save:
        for key,expr in save.items():
            expr = re.sub(r'\bdata\b', 'result', expr)
            script.append(f'pm.test("Save {key}", () => {{ pm.expect({expr}).to.exist; pm.collectionVariables.set("{key}", {expr}); }});')
    if check: check = re.sub(r'\bdata\b', 'result', check)
    if check: script.append('pm.test("Response contract / business state", () => { '+check+' });')
    request={'method':method,'header':[], 'url':'{{baseUrl}}'+path,'auth':{'type':'noauth'} if not token else {'type':'bearer','bearer':[{'key':'token','value':'{{'+token+'}}','type':'string'}]}}
    if body is not None:
        request['header']=[{'key':'Content-Type','value':'application/json'}]
        request['body']={'mode':'raw','raw':json.dumps(body,ensure_ascii=False),'options':{'raw':{'language':'json'}}}
    items.append({'name':name,'request':request,'event':[{'listen':'test','script':{'type':'text/javascript','exec':script}}], 'description':route or path})
    coverage.add((method,normalize(route or path.split('?')[0])))
def normalize(s): return re.sub(r'\{\{[^}]+\}\}|\{[^}]+\}', '{}',s)
coverage=set()
a=folder('01 · Đăng nhập và phân quyền')
req(a,'Admin login','POST','/api/admin/auth/login',body={'username':'{{adminUsername}}','password':'{{adminPassword}}'},token=None,save={'adminToken':'data.token'},check='pm.expect(data.role).to.eql("ADMIN");')
req(a,'Admin profile','GET','/api/admin/auth/me',check='pm.expect(data.username).to.eql(pm.environment.get("adminUsername"));')
req(a,'Wrong password','POST','/api/admin/auth/login',401,{'username':'{{adminUsername}}','password':'wrong-password'},None)
req(a,'Missing credentials','POST','/api/admin/auth/login',400,{'username':'','password':''},None)
req(a,'Admin requires authentication','GET','/api/admin/foods',401,token=None)
req(a,'Invalid admin token','GET','/api/admin/foods',401,token='invalidToken')
# CRUD independent from customer/KDS fixtures, deleted in reverse dependency order.
b=folder('02 · Admin CRUD và kiểm tra dữ liệu đã lưu')
resources=[
('station','kitchen-stations',{'name':'API {{runId}} station'},{'name':'API {{runId}} station updated'},'name'),
('category','categories',{'name':'API {{runId}} category','stationId':'{{stationId}}'},{'name':'API {{runId}} category updated','stationId':'{{stationId}}'},'name'),
('ingredient','ingredients',{'name':'API {{runId}} ingredient','unit':'kg','stockQuantity':100,'minThreshold':1},{'name':'API {{runId}} ingredient updated','unit':'kg','stockQuantity':120,'minThreshold':2},'stockQuantity'),
('food','foods',{'name':'API {{runId}} food','categoryId':'{{categoryId}}','price':10000,'estimatedCookingTime':5},{'name':'API {{runId}} food updated','categoryId':'{{categoryId}}','price':12000,'estimatedCookingTime':6},'price'),
('group','option-groups',{'name':'API {{runId}} group','selectionType':'SINGLE_CHOICE'},{'name':'API {{runId}} group updated','selectionType':'MULTI_CHOICE'},'selectionType'),
('option','options',{'foodId':'{{foodId}}','name':'Extra','groupId':'{{groupId}}','ingredientId':'{{ingredientId}}','adjustAmount':1,'adjustType':'ADD','priceDelta':1000,'scaleFactor':1},{'foodId':'{{foodId}}','name':'Extra updated','groupId':'{{groupId}}','ingredientId':'{{ingredientId}}','adjustAmount':2,'adjustType':'ADD','priceDelta':2000,'scaleFactor':1},'priceDelta'),
('combo','combos',{'name':'API {{runId}} combo','discountType':'PERCENT','discountValue':10},{'name':'API {{runId}} combo updated','discountType':'PERCENT','discountValue':20},'discountValue'),
('table','tables',{'floor':'API {{runId}}','tableNumber':'CRUD','status':'AVAILABLE'},{'floor':'API {{runId}}','tableNumber':'CRUD updated','status':'SERVING'},'status')]
for key,path,create,update,field in resources:
    route='/api/admin/'+path
    req(b,'List '+path,'GET',route,check='pm.expect(data).to.be.an("array");')
    req(b,'Create '+key,'POST',route,201,create,save={key+'Id':'data.id'})
    req(b,'Read '+key,'GET',route+'/{{'+key+'Id}}',check=f'pm.expect(String(data.id)).to.eql(String(pm.collectionVariables.get("{key}Id")));')
    expected=json.dumps(update[field])
    if isinstance(update[field], str): expected = "pm.variables.replaceIn(" + expected + ")"
    req(b,'Update '+key,'PUT',route+'/{{'+key+'Id}}',body=update,check=f'pm.expect(data.{field}).to.eql({expected});')
    req(b,'Verify persisted '+key,'GET',route+'/{{'+key+'Id}}',check=f'pm.expect(data.{field}).to.eql({expected});')
req(b,'Create recipe','POST','/api/admin/recipes',201,{'foodId':'{{foodId}}','ingredientId':'{{ingredientId}}','quantityRequired':1},save={'recipeId':'data.id'})
req(b,'Update recipe','PUT','/api/admin/recipes/{{recipeId}}',body={'foodId':'{{foodId}}','ingredientId':'{{ingredientId}}','quantityRequired':2},check='pm.expect(data.quantityRequired).to.eql(2);')
req(b,'Recipes persisted','GET','/api/admin/foods/{{foodId}}/recipes',check='pm.expect(data.some(x => x.quantityRequired === 2)).to.eql(true);')
req(b,'Add combo food','POST','/api/admin/combos/{{comboId}}/items',201,{'foodId':'{{foodId}}','quantity':2})
req(b,'Combo food persisted','GET','/api/admin/combos/{{comboId}}/items',check='pm.expect(data[0].quantity).to.eql(2);')
# Stock transaction uses fixture ingredient: keeps independent CRUD ingredient deletable.
for kind,qty,stock in [('IMPORT',5,105),('EXPORT',2,103),('ADJUST',1,104)]:
    req(b,'Stock '+kind,'POST','/api/admin/stock-transactions',201,{'ingredientId':900001,'type':kind,'quantity':qty,'note':'API test'})
    req(b,'Verify stock '+kind,'GET','/api/admin/ingredients/900001',check=f'pm.expect(data.stockQuantity).to.eql({stock});',route='/api/admin/ingredients/{id}')
req(b,'Stock history','GET','/api/admin/stock-transactions',check='pm.expect(data).to.be.an("array");')
for key,path,body in [
('staff','staff-accounts',{'username':'api.staff.{{runId}}','password':'Test@12345','role':'RECEPTIONIST'}),
('kitchen','kitchen-accounts',{'username':'api.kitchen.{{runId}}','password':'Test@12345','stationId':900001})]:
    req(b,'List '+path,'GET','/api/admin/'+path,check='pm.expect(data).to.be.an("array");')
    req(b,'Create '+key,'POST','/api/admin/'+path,201,body,save={key+'Id':'data.id'},check='pm.expect(data).not.to.have.property("passwordHash");')
    req(b,'Update '+key,'PUT','/api/admin/'+path+'/{{'+key+'Id}}',body=body)
    req(b,'Login '+key,'POST','/api/auth/login',body={'username':body['username'],'password':body['password']},token=None,save={key+'Token':'data.token'},check='pm.expect(data.accountType).to.eql("'+('STAFF' if key=='staff' else 'KITCHEN')+'");')
req(b,'Receptionist denied admin','GET','/api/admin/foods',403,token='staffToken')
req(b,'Kitchen denied admin','GET','/api/admin/foods',403,token='kitchenToken')
req(b,'Non-admin login rejected','POST','/api/admin/auth/login',403,{'username':'api.staff.{{runId}}','password':'Test@12345'},None)
req(b,'Unknown food','GET','/api/admin/foods/999999999',404,route='/api/admin/foods/{id}')
req(b,'Negative food price','POST','/api/admin/foods',400,{'name':'Invalid','categoryId':'{{categoryId}}','price':-1,'estimatedCookingTime':5})
req(b,'Negative stock quantity','POST','/api/admin/stock-transactions',400,{'ingredientId':900001,'type':'IMPORT','quantity':-1})
c=folder('03 · Khách hàng: menu, đặt món, hóa đơn, hủy món, gọi nhân viên')
req(c,'Table info','GET','/api/customer/tables/900002',token=None,check='pm.expect(data.id).to.eql(900002);',route='/api/customer/tables/{tableId}')
req(c,'Menu','GET','/api/customer/menu',token=None,check='pm.expect(data.categories).to.be.an("array"); pm.expect(data.combos).to.be.an("array");')
req(c,'Food detail','GET','/api/customer/foods/900001',token=None,check='pm.expect(data.id).to.eql(900001); pm.expect(data.available).to.eql(true);',route='/api/customer/foods/{foodId}')
req(c,'Food availability','GET','/api/customer/foods/900001/availability?quantity=1',token=None,check='pm.expect(data.available).to.eql(true);',route='/api/customer/foods/{foodId}/availability')
req(c,'Place food order','POST','/api/customer/orders',201,{'tableId':900002,'items':[{'foodId':900001,'quantity':2,'optionIds':[]}],'combos':[]},None,{'orderId':'data.orderId','orderItemId':'data.items[0].id'},'pm.expect(data.totalAmount).to.eql(20000); pm.expect(data.items[0].status).to.eql("PENDING");')
req(c,'Invoice includes order','GET','/api/customer/tables/900002/invoice',token=None,check='pm.expect(data.orders.some(x => String(x.orderId) === String(pm.collectionVariables.get("orderId")))).to.eql(true);',route='/api/customer/tables/{tableId}/invoice')
req(c,'Cancel pending item','POST','/api/customer/tables/900002/order-items/{{orderItemId}}/cancel',token=None,check='const item = data.orders.flatMap(x => x.items).find(x => String(x.id) === String(pm.collectionVariables.get("orderItemId"))); pm.expect(item.status).to.eql("REJECTED"); pm.expect(item.cancelledByCustomer).to.eql(true);',route='/api/customer/tables/{tableId}/order-items/{orderItemId}/cancel')
req(c,'Call staff','POST','/api/customer/tables/900002/call-staff',201,token=None,save={'callId':'data.id'},check='pm.expect(data.alreadyPending).to.eql(false);',route='/api/customer/tables/{tableId}/call-staff')
req(c,'Duplicate call is idempotent','POST','/api/customer/tables/900002/call-staff',201,token=None,check='pm.expect(data.alreadyPending).to.eql(true); pm.expect(String(data.id)).to.eql(String(pm.collectionVariables.get("callId")));',route='/api/customer/tables/{tableId}/call-staff')
req(c,'Unknown customer table','GET','/api/customer/tables/999999999',404,token=None,route='/api/customer/tables/{tableId}')
d=folder('04 · Bếp: đọc đơn, bắt đầu nấu, trừ kho, hoàn thành')
req(d,'Kitchen board','GET','/api/kds/orders',token='kitchenToken',check='pm.expect(data).to.be.an("array"); pm.expect(data.some(x => x.items.some(i => i.id === 900001))).to.eql(true);')
req(d,'Start first item','POST','/api/kds/items/900001/start',204,token='kitchenToken',route='/api/kds/items/{itemId}/start')
req(d,'Verify stock deducted once','GET','/api/admin/ingredients/900001',check='pm.expect(data.stockQuantity).to.eql(103);',route='/api/admin/ingredients/{id}')
req(d,'Reject starting twice','POST','/api/kds/items/900001/start',400,token='kitchenToken',route='/api/kds/items/{itemId}/start')
req(d,'Finish first item','POST','/api/kds/items/900001/finish',204,token='kitchenToken',route='/api/kds/items/{itemId}/finish')
req(d,'Legacy start-cooking API','POST','/api/kds/order-items/900002/start-cooking',token='kitchenToken',check='pm.expect(data.id).to.eql(900002); pm.expect(data.status).to.eql("COOKING");',route='/api/kds/order-items/{id}/start-cooking')
req(d,'Verify legacy stock deduction','GET','/api/admin/ingredients/900001',check='pm.expect(data.stockQuantity).to.eql(102);',route='/api/admin/ingredients/{id}')
req(d,'Finish second item','POST','/api/kds/items/900002/finish',204,token='kitchenToken',route='/api/kds/items/{itemId}/finish')
req(d,'Verify DONE on board','GET','/api/kds/orders',token='kitchenToken',check='const items=data.flatMap(x=>x.items); pm.expect(items.find(x=>x.id===900001).status).to.eql("DONE"); pm.expect(items.find(x=>x.id===900002).status).to.eql("DONE");')
e=folder('05 · Endpoint thử nghiệm của backend')
req(e,'Get or create invoice','POST','/api/test/invoice?tableId=900002',check='pm.expect(data.tableId).to.eql(900002); pm.expect(data.status).to.eql("OPEN");')
req(e,'Broadcast HTTP acknowledgement','POST','/api/test/broadcast?message=API-test')
req(e,'Intentional error MUST be 404','GET','/api/test/error',404)
f=folder('06 · Xóa dữ liệu CRUD và kiểm tra nhật ký')
for path in ['/combos/{{comboId}}/items/{{foodId}}','/recipes/{{recipeId}}','/options/{{optionId}}','/combos/{{comboId}}','/option-groups/{{groupId}}','/foods/{{foodId}}','/ingredients/{{ingredientId}}','/categories/{{categoryId}}','/kitchen-stations/{{stationId}}','/tables/{{tableId}}','/staff-accounts/{{staffId}}','/kitchen-accounts/{{kitchenId}}']:
    req(f,'Delete '+path,'DELETE','/api/admin'+path,204)
req(f,'Verify deleted food','GET','/api/admin/foods/{{foodId}}',404)
req(f,'Activity logs include test writes','GET','/api/admin/activity-logs',check='pm.expect(data.some(x => String(x.targetId) === String(pm.collectionVariables.get("foodId")))).to.eql(true);')
collection={'info':{'name':'Smart POS · All REST APIs · Isolated test','schema':'https://schema.getpostman.com/json/collection/v2.1.0/collection.json','description':'Run all folders in order, one iteration, against tests/api/compose.yml on localhost:18080. Mutates disposable data. HTTP 404 in intentional error tests is expected.'},'variable':[{'key':'invalidToken','value':'invalid-token'}], 'event':[{'listen':'prerequest','script':{'type':'text/javascript','exec':[
'if (pm.environment.get("baseUrl") !== "http://localhost:18080" || pm.environment.get("testDatabase") !== "DISPOSABLE") { pm.execution.skipRequest(); throw new Error("Select the isolated API Test environment on localhost:18080. Never use the working DB."); }',
'if (pm.info.requestName === "Admin login") { pm.collectionVariables.set("runId", Date.now().toString()); ["adminToken", "staffToken", "kitchenToken"].forEach(k => pm.collectionVariables.unset(k)); }'
]}}], 'item':folders}
(OUT/'Smart-POS.postman_collection.json').write_text(json.dumps(collection,ensure_ascii=False,indent=2)+'\n')
env={'name':'Smart POS · Disposable Docker :18080','values':[{'key':k,'value':v,'enabled':True,'type':'secret' if 'Password' in k else 'default'} for k,v in {'baseUrl':'http://localhost:18080','testDatabase':'DISPOSABLE','adminUsername':'admin.demo','adminPassword':'Admin@123'}.items()],'_postman_variable_scope':'environment'}
(OUT/'Local-Test.postman_environment.json').write_text(json.dumps(env,ensure_ascii=False,indent=2)+'\n')
# Check every explicit REST mapping in source. Normalize parameter names, not route literals.
actual={}
for source in sorted((ROOT/'src/main/java').rglob('*Controller.java')):
    code=source.read_text()
    head=code.split('public class')[0]
    base=re.search(r'@RequestMapping\("([^"]*)"\)',head)
    base=base.group(1) if base else ''
    for method,path in re.findall(r'@(Get|Post|Put|Delete|Patch)Mapping\("([^"]*)"\)',code):
        actual[(method.upper(),normalize(base+path))]=str(source.relative_to(ROOT))
missing=set(actual)-coverage
lines=['# REST endpoint coverage','',f'{len(actual)} distinct method + path mappings; {sum(len(f["item"]) for f in folders)} requests.','', '| Method | Path | In collection |','|---|---|---|']
for (method,path),source in sorted(actual.items()): lines.append(f'| {method} | `{path}` | {"Yes" if (method,path) in coverage else "MISSING"} |')
(OUT/'COVERAGE.md').write_text('\n'.join(lines)+'\n')
if missing: raise SystemExit(f'Missing endpoint scenarios: {missing}')
print(f'Covered {len(actual)} REST mappings in {sum(len(f["item"]) for f in folders)} requests')
