import { test, expect } from "@playwright/test";
import path from "node:path";

test("Admin workflows persist recipes, image and combo; journal and printable QR work", async ({
  page,
  request,
}, testInfo) => {
  const foodName = `E2E food ${Date.now()}`;
  const comboName = `E2E combo ${Date.now()}`;
  const api = "http://localhost:18080/api";
  const login = await request.post(`${api}/admin/auth/login`, {
    data: { username: "admin.demo", password: "Admin@123" },
  });
  expect(login.ok()).toBeTruthy();
  const headers = { Authorization: `Bearer ${(await login.json()).token}` };
  const created = await request.post(`${api}/admin/foods`, {
    headers,
    data: {
      name: foodName,
      categoryId: 900001,
      price: 20000,
      estimatedCookingTime: 5,
    },
  });
  expect(created.status()).toBe(201);
  const food = await created.json();
  const comboResponse = await request.post(`${api}/admin/combos`, {
    headers,
    data: { name: comboName, discountType: "FIXED", discountValue: 30000 },
  });
  expect(comboResponse.status()).toBe(201);
  const combo = await comboResponse.json();
  const apiGet = async (route: string) =>
    (await request.get(api + route, { headers })).json();
  await page.goto("/");
  await page.locator('input[type="text"]').fill("admin.demo");
  await page.locator('input[type="password"]').fill("Admin@123");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Dashboard", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Doanh thu", exact: true }),
  ).toHaveCount(0);
  const ingredients = await apiGet("/admin/ingredients");
  await expect(page.locator(".stock-summary-row")).toHaveCount(
    ingredients.length,
  );
  await page.getByRole("button", { name: "Mở nhật ký tổng hợp" }).click();
  let dialog = page.getByRole("dialog");
  await expect(
    dialog.getByText("Giao dịch kho", { exact: true }).first(),
  ).toBeVisible();
  await dialog.getByLabel("Ngày hoạt động").fill("2000-01-01");
  await expect(
    dialog.getByText("Không có hoạt động trong ngày đã chọn."),
  ).toBeVisible();
  await dialog.getByRole("button", { name: "Đóng", exact: true }).click();

  await page.goto("/#/menu");
  const foodRow = page.getByRole("row").filter({ hasText: foodName });
  await foodRow.getByRole("button", { name: "Sửa", exact: true }).click();
  dialog = page.getByRole("dialog");
  await dialog
    .locator('input[type="file"]')
    .setInputFiles(path.resolve("../../tests/api/fixtures/food.png"));
  await expect(dialog.getByAltText("Ảnh món ăn đã chọn")).toBeVisible();
  await dialog.getByRole("button", { name: "Lưu món", exact: true }).click();
  await expect
    .poll(async () => (await apiGet(`/admin/foods/${food.id}`)).image)
    .toMatch(/^\/api\/customer\/media\//);
  const recipe = dialog.locator(".recipe-editor");
  await recipe.getByRole("combobox").selectOption("900001");
  await recipe.getByRole("spinbutton").fill("0.25");
  await recipe.getByRole("button", { name: "Thêm nguyên liệu" }).click();
  await expect(
    recipe.getByRole("cell", { name: "0.25 kg", exact: true }),
  ).toBeVisible();
  await expect
    .poll(
      async () =>
        (await apiGet(`/admin/foods/${food.id}/recipes`))[0]?.quantityRequired,
    )
    .toBe(0.25);
  await dialog.getByRole("button", { name: "Đóng", exact: true }).click();

  await page.getByRole("tab", { name: "Combo", exact: true }).click();
  const comboRow = page.getByRole("row").filter({ hasText: comboName });
  await comboRow.getByRole("button", { name: /Quản lý món/ }).click();
  dialog = page.getByRole("dialog");
  await dialog.locator("select").selectOption(String(food.id));
  await dialog.getByRole("spinbutton").fill("2");
  await dialog.getByRole("button", { name: "+ Thêm", exact: true }).click();
  await expect(
    dialog.getByRole("cell", { name: foodName, exact: true }),
  ).toBeVisible();
  expect((await apiGet(`/admin/combos/${combo.id}/items`))[0].quantity).toBe(2);
  await dialog
    .getByRole("button", { name: "Đóng", exact: true })
    .first()
    .click();

  await page.goto("/#/tables");
  await page.getByRole("button", { name: /Thêm bàn/ }).click();
  dialog = page.getByRole("dialog");
  await expect(dialog.getByText(/Bàn mới luôn/)).toBeVisible();
  await expect(dialog.locator('option[value="SERVING"]')).toHaveCount(0);
  await dialog.getByRole("button", { name: "Đóng", exact: true }).click();
  await page
    .getByRole("button", { name: "Mã QR", exact: true })
    .first()
    .click();
  dialog = page.getByRole("dialog");
  await expect(dialog.getByAltText("Mã QR gọi món")).toBeVisible();
  await page.evaluate(() => { (window as Window & { __printCalls: number }).__printCalls = 0; window.print = () => { (window as Window & { __printCalls: number }).__printCalls++; }; });
  await dialog.getByRole("button", { name: "In mã bàn này" }).click();
  expect(await page.evaluate(() => (window as Window & { __printCalls: number }).__printCalls)).toBe(1);
  await page.emulateMedia({ media: "print" });
  await expect(dialog.getByAltText("Mã QR gọi món")).toBeVisible();
  await expect(page.locator("#root")).toBeHidden();
  await page.screenshot({
    path: testInfo.outputPath("qr-print.png"),
    fullPage: true,
  });
  await page.pdf({
    path: testInfo.outputPath("qr-print.pdf"),
    format: "A4",
    printBackground: true,
  });
  await page.emulateMedia({ media: "screen" });
  await dialog.getByRole("button", { name: "Đóng", exact: true }).click();
  await page
    .getByRole("button", { name: "Bộ lọc & Mã QR", exact: true })
    .click();
  await page.locator('input[type="checkbox"]').nth(1).check();
  await page.locator('input[type="checkbox"]').nth(2).check();
  await page.getByRole("button", { name: /In mã QR \(2\)/ }).click();
  await expect(
    page.getByRole("dialog").getByAltText("Mã QR gọi món"),
  ).toHaveCount(2);
  await page.emulateMedia({ media: "print" });
  await expect(
    page.getByRole("dialog").getByAltText("Mã QR gọi món").first(),
  ).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("qr-batch.png"), fullPage: true });
  await page.pdf({
    path: testInfo.outputPath("qr-batch.pdf"),
    format: "A4",
    printBackground: true,
  });

  // Delete independent fixture records. No production database is used.
  await request.delete(`${api}/admin/combos/${combo.id}/items/${food.id}`, {
    headers,
  });
  await request.delete(`${api}/admin/combos/${combo.id}`, { headers });
  const recipes = await apiGet(`/admin/foods/${food.id}/recipes`);
  for (const r of recipes)
    await request.delete(`${api}/admin/recipes/${r.id}`, { headers });
  await request.delete(`${api}/admin/foods/${food.id}`, { headers });
});
