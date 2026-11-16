import { test, expect } from "@playwright/test";
test("protected routes and complete local garage workflow", async ({
  page,
}) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/login/);
  await page.getByRole("button", { name: "Explore sample garage" }).click();
  await expect(
    page.getByRole("heading", { name: "Welcome back." }),
  ).toBeVisible();
  await expect(page.getByText("DEMO WORKSPACE")).toBeVisible();
  await page.screenshot({
    path: `test-results/dashboard-${test.info().project.name}.png`,
    fullPage: true,
  });
  await expect(page.locator("body")).toHaveJSProperty(
    "scrollWidth",
    await page.evaluate(() => window.innerWidth),
  );
  await page.goto("/garage");
  await page.getByRole("button", { name: "Add vehicle", exact: true }).click();
  await page.getByLabel("Brand *", { exact: true }).fill("Yamaha");
  await page.getByLabel("Model *", { exact: true }).fill("Test ride");
  await page.getByLabel("Registration number *").fill("TEST123");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(
    page.getByRole("heading", { name: /Yamaha Test ride/ }),
  ).toBeVisible();
  await page.goto("/maintenance");
  await page.getByRole("button", { name: "Log service" }).click();
  await page.getByLabel(/Maintenance category/).fill("Engine oil");
  await page.getByLabel("Description *").fill("Test oil service");
  await page.getByLabel("Cost (RM) *", { exact: true }).fill("45.50");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(
    page.getByRole("cell", { name: "Test oil service", exact: false }),
  ).toBeVisible();
  await page.goto("/expenses");
  await page.getByRole("button", { name: "Add expense" }).click();
  await page.getByLabel("Description *").fill("Test parking");
  await page.getByLabel("Amount (RM) *", { exact: true }).fill("5.00");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(
    page.getByRole("cell", { name: "Test parking", exact: true }),
  ).toBeVisible();
  await page.goto("/dashboard");
  await expect(page.getByText("Test parking")).toBeVisible();
  await page.goto("/settings");
  await page
    .locator("main")
    .getByRole("button", { name: "Sign out", exact: true })
    .click();
  await expect(page).toHaveURL(/login/);
});
test("mileage, fuel, custom reminders, documents and deletion work", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "Explore sample garage" }).click();
  await page.getByRole("button", { name: "Update mileage" }).click();
  await page.getByLabel("Odometer reading (km) *").fill("9600");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("9,600", { exact: false }).first()).toBeVisible();
  await page.goto("/fuel");
  await page.getByRole("button", { name: "Log fuel", exact: true }).click();
  await page.getByLabel("Litres *").fill("5.50");
  await page.getByLabel("Total cost (RM) *").fill("11.28");
  await page.getByLabel("Filled to a full tank").check();
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("5.5 L", { exact: false })).toBeVisible();
  await page.goto("/reminders");
  await page.getByRole("button", { name: "Add reminder" }).click();
  await page.getByLabel("Maintenance category *").fill("Custom inspection");
  await page.getByLabel("Next due mileage (km)").fill("12000");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(
    page.getByRole("heading", { name: "Custom inspection" }),
  ).toBeVisible();
  await page.goto("/documents");
  await page.getByRole("button", { name: "Add document" }).click();
  await page.getByLabel("Document title *").fill("Test insurance");
  await page.getByLabel("Expiry date").fill("2027-01-01");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(
    page.getByRole("cell", { name: "Test insurance", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Delete Test insurance" }).click();
  await page
    .getByRole("button", { name: "Delete record", exact: true })
    .click();
  await expect(
    page.getByRole("cell", { name: "Test insurance", exact: true }),
  ).toHaveCount(0);
});
