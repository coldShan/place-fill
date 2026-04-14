import test from "node:test";
import assert from "node:assert/strict";
import smartfillControllerPkg from "../extension/src/content-script-smartfill.js";

const { buildRecommendationItems, MAX_RECOMMENDATION_ITEMS } = smartfillControllerPkg;

function createFavorite(id, profile) {
  return {
    id,
    name: "常用数据",
    createdAt: "1",
    updatedAt: "1",
    profile: {
      creditCode: "",
      companyName: "",
      fullName: "",
      idNumber: "",
      bankCard: "",
      mobile: "",
      email: "",
      landline: "",
      address: "",
      ...profile
    }
  };
}

test("recommendation items prioritize current field value, include context, and skip empty matches", () => {
  assert.deepEqual(
    buildRecommendationItems("mobile", [
      createFavorite("mobile-1", { mobile: "13300000001", fullName: "张唯", companyName: "星海科技" }),
      createFavorite("mobile-2", { mobile: "", fullName: "空值", companyName: "应被过滤" }),
      createFavorite("mobile-3", { mobile: "13300000003", fullName: "李青" }),
      createFavorite("mobile-4", { mobile: "13300000004", companyName: "远山物流" })
    ]),
    [
      { id: "mobile-1", primaryText: "13300000001", secondaryText: "张唯 / 星海科技" },
      { id: "mobile-3", primaryText: "13300000003", secondaryText: "李青" },
      { id: "mobile-4", primaryText: "13300000004", secondaryText: "远山物流" }
    ]
  );
});

test("recommendation items are capped at ten records", () => {
  const favorites = Array.from({ length: 12 }, function (_value, index) {
    return createFavorite("mobile-" + index, {
      mobile: "133000000" + String(index).padStart(2, "0"),
      fullName: "用户" + index
    });
  });

  const items = buildRecommendationItems("mobile", favorites);

  assert.equal(items.length, MAX_RECOMMENDATION_ITEMS);
  assert.equal(items[0]?.id, "mobile-0");
  assert.equal(items[MAX_RECOMMENDATION_ITEMS - 1]?.id, "mobile-9");
});
