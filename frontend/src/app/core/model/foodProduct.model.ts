export interface Nutriments {
  // --- Energy ---
  energy_kcal_100g?: number;
  energy_kcal_unit?: string;
  energy_100g?: number; // energy in kJ
  energy_unit?: string;

  // --- Macronutrients ---
  fat_100g?: number;
  "saturated-fat_100g"?: number;
  carbohydrates_100g?: number;
  sugars_100g?: number;
  fiber_100g?: number;
  proteins_100g?: number;
  salt_100g?: number;
  sodium_100g?: number;

  // --- Micronutrients ---
  calcium_100g?: number;
  iron_100g?: number;
  "vitamin-c_100g"?: number;

  // --- Nutri-score computation helpers ---
  "nutrition-score-fr_100g"?: number;
  "fruits-vegetables-nuts-colza-walnut-and-olive-oils_100g"?: number;
}

export interface EcoScoreData {
  grade?: 'a' | 'b' | 'c' | 'd' | 'e' | 'not-applicable' | string;
  status?: string;
  warnings?: string[];
}
export interface OpenFoodFactsProduct {
  code: string;
  id?: string;

  // --- Names & Descriptions ---
  product_name?: string;
  product_name_en?: string;
  product_name_hi?: string;
  generic_name?: string;

  // --- Branding & Classification ---
  brands?: string;
  brand_owner?: string; // 🔹 Sometimes OFF uses this
  quantity?: string;
  categories_tags?: string[];
  categories?: string;
  labels_tags?: string[];
  countries_tags?: string[];
  packaging?: string;

  // --- Nutritional & Environmental Info ---
  nutriments?: Nutriments;
  nutri_score_grade?: string; // keep flexible
  nutriscore_score?: number; // sometimes numeric
  nova_group?: number; // 🔹 NOVA classification
  ecoscore_grade?: string;
  ecoscore_data?: EcoScoreData;
  nutrition_grade_fr?: string; // OFF legacy field

  // --- Allergen & Ingredient Info ---
  ingredients_text_en?: string;
  ingredients_text?: string;
  allergens_tags?: string[];
  allergens_from_ingredients?: string;
  additives_tags?: string[];
  traces_tags?: string[];
  ingredients_from_palm_oil_n?: number;
  ingredients_that_may_be_from_palm_oil_n?: number;

  // --- Media ---
  image_front_url?: string;
  image_small_url?: string;
  image_ingredients_url?: string;
  image_nutrition_url?: string;

  // --- Additional Metadata ---
  stores?: string;
  manufacturing_places?: string;
  packaging_tags?: string[];
  lang?: string;

  // --- Computed / Custom Fields ---
  health_score?: number;
  recommendation_reason?: string;
}
