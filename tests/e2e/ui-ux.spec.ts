import AxeBuilder from "@axe-core/playwright";
import {expect,test,type Page} from "@playwright/test";

const accountTypes=["chatgpt","claude","gemini","adobe","microsoft-365","canva","midjourney","perplexity"];
const seller=(rank:number)=>({
  id:`00000000-0000-4000-8000-00000000000${rank}`,
  username:rank===1?"extremely_long_reviewed_seller_handle_123456789":"reviewed_seller_"+rank,
  normalized_username:rank===1?"extremely_long_reviewed_seller_handle_123456789":"reviewed_seller_"+rank,
  unresolved_amount:String(987654321.12-rank),reported_purchase_value:String(1234567890.12-rank),
  accounts_reported_purchased:987654-rank,report_count:999-rank,account_types:accountTypes,
  has_avatar:false,avatar_updated_at:null,primary_account_type:"chatgpt",
  primary_account_type_quantity:900000-rank,primary_account_type_reported_purchase_value:String(900000000-rank),
});
const populated={totals:{unresolved_amount:"2962962960.36",report_count:2994,visible_sellers:3,reported_purchase_value:"3703703667.36",accounts_reported_purchased:2962960},leaders:[seller(1),seller(2),seller(3)],recent:[]};

async function setTheme(page:Page,theme:"light"|"dark"){
  await page.addInitScript(value=>localStorage.setItem("theme",value),theme);
}
async function mockHome(page:Page,status=200){
  await page.route("**/api/overview",route=>status===200?route.fulfill({status,contentType:"application/json",body:JSON.stringify(populated)}):route.fulfill({status,body:"{}"}));
  await page.route("**/api/account-types",route=>route.fulfill({status:200,contentType:"application/json",body:"[]"}));
}
async function noOverflow(page:Page){
  const dimensions=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
  expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.width+1);
}
async function waitForImages(page:Page){
  await page.evaluate(async()=>{const images=Array.from(document.images).filter(image=>getComputedStyle(image).display!=="none");images.forEach(image=>image.loading="eager");await Promise.all(images.map(image=>image.complete?Promise.resolve():new Promise<void>(resolve=>{image.addEventListener("load",()=>resolve(),{once:true});image.addEventListener("error",()=>resolve(),{once:true})})))});
}
async function intersects(page:Page,a:string,b:string){
  return page.evaluate(([left,right])=>{const x=document.querySelector(left)?.getBoundingClientRect(),y=document.querySelector(right)?.getBoundingClientRect();return Boolean(x&&y&&x.left<y.right&&x.right>y.left&&x.top<y.bottom&&x.bottom>y.top)},[a,b]);
}

for(const width of [320,390,768,1280,1440]){
  for(const theme of ["light","dark"] as const){
    test(`home layout ${width}px ${theme}`,async({page})=>{
      await page.setViewportSize({width,height:900});
      await page.emulateMedia({reducedMotion:"reduce"});
      await setTheme(page,theme); await mockHome(page); await page.goto("/");
      await expect(page.getByText("@extremely_long_reviewed_seller_handle_123456789").first()).toBeVisible();
      await noOverflow(page);
      expect(await intersects(page,'[data-qa-protected="hero-copy"]','[data-qa-decoration="hero-art"]')).toBe(false);
      const metric=page.getByText("₱1,234,567,889.12").first(); await expect(metric).toBeVisible();
      if(width<=390) await expect(page.locator(".mobile-quick-actions")).toBeVisible();
      await waitForImages(page);
      await expect(page).toHaveScreenshot(`home-${width}-${theme}.png`,{fullPage:true});
    });
  }
}

test("header order, touch targets, and dialog focus",async({page})=>{
  await page.setViewportSize({width:390,height:844}); await mockHome(page); await page.goto("/");
  const labels=await page.locator("header a, header button").evaluateAll(elements=>elements.map(element=>element.getAttribute("aria-label")||element.textContent?.trim()));
  expect(labels.slice(0,6)).toEqual(["fraus home","Main stage","Case files","Method","Switch to dark theme","Report unresolved loss"]);
  const report=page.getByRole("link",{name:"Report unresolved loss"}).first(),reportBox=await report.boundingBox();
  expect(reportBox?.height).toBeGreaterThanOrEqual(44);
  await report.click();
  const close=page.locator('[data-slot="dialog-close"]'),closeBox=await close.boundingBox();
  expect(closeBox?.width).toBeGreaterThanOrEqual(44); expect(closeBox?.height).toBeGreaterThanOrEqual(44);
  await expect(page.locator('[data-slot="dialog-content"]')).toBeVisible();
  const addProduct=page.getByRole("button",{name:"Add another product"});
  for(let index=1;index<8;index++) await addProduct.click();
  await expect(page.getByText("Product 08")).toBeVisible();
  await expect(addProduct).toBeDisabled();
  await page.getByRole("button",{name:"Submit for review"}).scrollIntoViewIfNeeded();
  await expect(page.getByRole("button",{name:"Submit for review"})).toBeVisible();
  await page.keyboard.press("Tab");
  expect(await page.evaluate(()=>document.querySelector('[data-slot="dialog-content"]')?.contains(document.activeElement))).toBe(true);
  await page.keyboard.press("Escape"); await expect(page.locator('[data-slot="dialog-content"]')).toBeHidden();
  await expect(report).toBeFocused();
});

test("reduced motion uses static artwork",async({page})=>{
  await page.emulateMedia({reducedMotion:"reduce"}); await mockHome(page,503); await page.goto("/");
  await expect(page.locator(".fraus-motion-animated").first()).toBeHidden();
  await expect(page.locator(".fraus-motion-static").first()).toBeVisible();
});

test("404 keeps reaction art clear of its heading and uses generic copy",async({page})=>{
  await page.setViewportSize({width:1280,height:800}); await page.goto("/definitely-missing-page");
  await expect(page.getByRole("heading",{name:"This page could not be found."})).toBeVisible();
  expect(await intersects(page,'[data-qa-protected="404-copy"]','.error-state-art')).toBe(false);
  await noOverflow(page);
});

for(const width of [390,1280]){
  test(`populated moderation layout ${width}px`,async({page})=>{
    await page.setViewportSize({width,height:900}); await page.goto("/qa-fixture/admin");
    await expect(page.locator(".admin-workspace")).toHaveAttribute("data-hydrated","true");
    await expect(page.getByRole("heading",{name:/Pending reports/})).toBeVisible();
    await expect(page.getByText("very_long_seller_handle_for_responsive_quality").first()).toBeVisible();
    await noOverflow(page);
    const productControlsAreContained=await page.locator("[data-qa-product-row]").evaluateAll(rows=>rows.every(row=>{
      const parent=row.getBoundingClientRect();
      return Array.from(row.querySelectorAll("input, select, button")).every(control=>{
        const box=control.getBoundingClientRect();
        return box.left>=parent.left-1&&box.right<=parent.right+1;
      });
    }));
    expect(productControlsAreContained).toBe(true);
    await expect(page).toHaveScreenshot(`admin-populated-${width}.png`,{fullPage:true});
  });
}

for(const path of ["/","/about","/methodology","/admin","/seller/no-such-seller","/correct/00000000-0000-4000-8000-000000000000","/definitely-missing-page"]){
  test(`no serious axe violations on ${path}`,async({page})=>{
    await mockHome(page); await page.goto(path);
    const results=await new AxeBuilder({page}).withTags(["wcag2a","wcag2aa","wcag21a","wcag21aa"]).analyze();
    expect(results.violations.filter(v=>["critical","serious"].includes(v.impact||""))).toEqual([]);
  });
}
