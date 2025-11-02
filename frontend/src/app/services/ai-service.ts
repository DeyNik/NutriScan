// src/app/services/ai.service.ts
import { Injectable } from '@angular/core';
import { environment } from '../../environment/environment';
import { productInfo } from '../core/model/product.model';
import { GoogleGenAI } from "@google/genai";
import { AiAnalysis } from './product-state-service';
import { firstValueFrom, map, Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';

@Injectable({
    providedIn: 'root'
})
export class AiService {

    private ai = new GoogleGenAI({ apiKey: "AIzaSyB7g9br7w8Cx71kTxMMuty1kKqZUd-CrBI" });

    constructor(private http: HttpClient) { }

    filterAndNormalizeProduct(raw: any): any {
        if (!raw) return null;
        const p = raw.product || raw;

        const safe = (v: any) => (v !== undefined && v !== null && v !== '' ? v : null);

        // --- Normalize category ---
        const category =
            p.categories_tags?.length
                ? p.categories_tags[p.categories_tags.length - 1].replace(/^en:/, '')
                : p.categories || 'unknown';

        // --- Normalize nutrient data with safe fallbacks ---
        const nutriments = p.nutriments
            ? {
                energy_kcal_100g: safe(p.nutriments['energy-kcal_100g']) ?? safe(p.nutriments.energy_kcal_100g),
                energy_100g: safe(p.nutriments['energy_100g']) ?? safe(p.nutriments.energy),
                fat_100g: safe(p.nutriments.fat_100g),
                saturated_fat_100g: safe(p.nutriments['saturated-fat_100g']),
                carbohydrates_100g: safe(p.nutriments.carbohydrates_100g),
                sugars_100g: safe(p.nutriments.sugars_100g),
                fiber_100g: safe(p.nutriments.fiber_100g),
                proteins_100g: safe(p.nutriments.proteins_100g),
                salt_100g: safe(p.nutriments.salt_100g),
                sodium_100g: safe(p.nutriments.sodium_100g),
                calcium_100g: safe(p.nutriments.calcium_100g),
                iron_100g: safe(p.nutriments.iron_100g),
                vitamin_c_100g: safe(p.nutriments['vitamin-c_100g']),
            }
            : {};

        // --- Compose normalized object ---
        return {
            code: p.code,
            product_name: p.product_name || 'Unknown Product',
            brands: p.brands || p.brand_owner || 'Unknown Brand',
            category,
            quantity: p.quantity || '',
            nutriments,
            nutri_score_grade:
                p.nutri_score_grade ||
                p.nutriscore_grade ||
                p.nutrition_grade_fr ||
                null,
            ecoscore_grade: p.ecoscore_grade || null,
            nova_group: p.nova_group || null,
            ingredients_text:
                p.ingredients_text_en || p.ingredients_text || 'No ingredient data',
            allergen_tags: p.allergens_tags || [],
            additives_tags: p.additives_tags || [],
            image_front_url: p.image_front_url || p.image_small_url || '',
            ecoscore_data: p.ecoscore_data || null,
            manufacturing_places: p.manufacturing_places || '',
        };
    }


    async analyzeProduct(productInfo: productInfo) {
        const product = this.filterAndNormalizeProduct(productInfo.product);

        // --- STEP 1: AI-based Category Inference ---
        if (!product.category || product.category === 'unknown') {
            const aiCategoryPrompt = `
      Identify the most likely general food or beverage category for this product.
      Use natural broad terms like "soft drink", "cereal", "instant noodles", "snack", etc.
      Product: ${product.product_name}
      Brand: ${product.brands}
      Ingredients: ${product.ingredients_text || 'unknown'}
      Return JSON: { "category": "<category name>" }
    `;
            const catResp = await this.ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: aiCategoryPrompt,
            });
            const text = catResp.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
            try {
                const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
                if (parsed.category) product.category = parsed.category.toLowerCase();
            } catch {
                const match = text.match(/"category":\s*"([^"]+)"/);
                if (match) product.category = match[1].toLowerCase();
            }
        }

        // --- STEP 2: Handle missing nutrients ---
        if (!product.nutriments || Object.keys(product.nutriments).length === 0) {
            product.nutriments = {
                note: `Nutrient profile estimated for ${product.category || 'this product'}`,
            };
        }

        const analysisPrompt = `
    You are a certified nutritionist AI.
    Analyze this product and its impact on health and lifestyle.
    Product Name: ${product.product_name}
    Brand: ${product.brands}
    Category: ${product.category}
    Nutrients: ${JSON.stringify(product.nutriments)}
    Nutri-score: ${product.nutri_score_grade || 'unknown'}
    Eco-score: ${product.ecoscore_grade || 'unknown'}
    NOVA: ${product.nova_group || 'unknown'}
    Ingredients: ${product.ingredients_text || 'unknown'}
    Allergens: ${JSON.stringify(product.allergen_tags)}
    Additives: ${JSON.stringify(product.additives_tags)}
    User Preferences: ${JSON.stringify(productInfo.userPreferences)}
    
    Return valid JSON ONLY with:
    {
      "score": number (0–100),
      "color": "primary|accent|warn",
      "advice": string,
      "nutrients": [
        {
          "name": string,
          "percent": number, 
          "levelColor": "primary" | "accent" | "warn"
        }
      ],
      "dietBadges": [{"label": string, "type": "ok|warn|avoid"}],
      "ingredients": [{"name": string, "type": "safe|caution|avoid"}],
      "alerts": [string],
      "summary": string,
      "additives": [
        {"code": string, "name": string, "purpose": string, "riskLevel": "low|moderate|high", "notes": string}
      ],
      "homemade_alternatives": [
        {
          "name": string,
          "description": string
        }
      ]
    }
    
    If no real nutrient data is available, **estimate realistic percentages based on the category and ingredients.**
    Use approximate daily value percentages (e.g., sugars ~80% for soda, fat ~10% for chips, fiber ~5% for cereals, etc.).
    Always provide a non-null "percent" and "levelColor" that reflect overall health impact.
    
    Additionally:
    - Provide **3 healthy homemade alternatives** that align with the user's preferences.
    - Each homemade alternative must include a short description of why it's a healthier substitute.
    - Prefer practical, quick, Indian-friendly recipes where relevant.
  `;

        // --- STEP 4: Get AI response and sanitize JSON ---
        let aiJson: any = {};
        try {
            const resp = await this.ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: analysisPrompt,
            });
            const text = resp.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
            try {
                aiJson = JSON.parse(text.replace(/```json|```/g, '').trim());
            } catch {
                const match = text.match(/\{[\s\S]*\}/);
                aiJson = match ? JSON.parse(match[0]) : {};
            }
        } catch {
            aiJson = {};
        }

        // --- STEP 5: Merge AI + OpenFoodFacts data ---
        const merged: AiAnalysis = {
            ...aiJson,
            productMeta: {
                name: product.product_name,
                brand: product.brands,
                image: product.image_front_url,
                nutriScore: product.nutri_score_grade,
                novaGroup: product.nova_group,
                ecoScore: product.ecoscore_grade,
                category: product.category,
            },
            nutrients:
                aiJson.nutrients?.length && aiJson.nutrients.some((n: any) => n.percent !== null)
                    ? aiJson.nutrients
                    : this.mapNutrientLevels(product.nutrient_levels || {}),
            dietBadges: aiJson.dietBadges || [],
            ingredients: aiJson.ingredients || [],
            alerts: aiJson.alerts || [],
            advice: aiJson.advice || 'No detailed advice available.',
            summary:
                aiJson.summary ||
                `Analysis generated with limited AI data. Category: ${product.category}.`,
            homemadeAlternatives: [],
            additives:
                aiJson.additives?.length
                    ? aiJson.additives
                    : (product.additives_tags || []).map((tag: string) => ({
                        code: tag.replace('en:', '').toUpperCase(),
                        name: null,
                        purpose: null,
                        riskLevel: 'moderate',
                        notes: 'No detailed data available — AI interpretation pending.'
                    })),
        };

        // --- STEP 6: Fetch YouTube videos for each homemade alternative ---
        // Process them sequentially to avoid overwhelming the API
        if (aiJson.homemade_alternatives?.length) {
            for (const alt of aiJson.homemade_alternatives) {
                try {
                    const videos = await firstValueFrom(this.searchRecipeVideos(alt.name, 1));
                    merged.homemadeAlternatives?.push({
                        name: alt.name,
                        description: alt.description,
                        videos: videos // Array of video objects
                    });
                } catch (error) {
                    console.error(`Failed to fetch video for ${alt.name}:`, error);
                    // Still add the alternative without video
                    merged.homemadeAlternatives?.push({
                        name: alt.name,
                        description: alt.description,
                        videos: []
                    });
                }
            }
        }

        return merged;
    }

    // Updated searchRecipeVideos to return proper YouTube URLs
    searchRecipeVideos(query: string, maxResults = 3): Observable<any[]> {
        const baseUrl = 'https://www.googleapis.com/youtube/v3/search';
        const params = {
            key: environment.youtubeApiKey,
            q: `${query} recipe healthy`,
            part: 'snippet',
            type: 'video',
            maxResults: maxResults.toString()
        };

        return this.http.get<any>(baseUrl, { params }).pipe(
            map(res => res.items.map((item: any) => ({
                title: item.snippet.title,
                videoId: item.id.videoId,
                thumbnail: item.snippet.thumbnails.medium.url,
                channelTitle: item.snippet.channelTitle,
                url: `https://www.youtube.com/watch?v=${item.id.videoId}` // Generate full URL
            })))
        );
    }
    
    private mapNutrientLevels(levels: any): { name: string; percent: number | null; levelColor: 'primary' | 'accent' | 'warn'; }[] {
        const mappings: Record<string, string> = {
            'fat': 'Fat',
            'saturated-fat': 'Saturated Fat',
            'sugars': 'Sugars',
            'salt': 'Salt',
            'fiber': 'Fiber',
            'proteins': 'Protein',
            'energy-kcal': 'Energy',
        };

        const levelColorMap: Record<string, 'primary' | 'accent' | 'warn'> = {
            low: 'primary',
            moderate: 'accent',
            high: 'warn',
        };

        // Always show these nutrients even if data missing
        const defaultNutrients = Object.entries(mappings).map(([key, label]) => {
            const level = levels?.[key];
            return {
                name: label,
                percent: null,
                levelColor: levelColorMap[level] || 'accent',
            };
        });

        return defaultNutrients;
    }


    async recommendProducts(payload: productInfo): Promise<any> {
        const { product, userPreferences } = payload;
        const queryName = product?.product_name || product?.brands || '';

        if (!queryName) return { recommendations: [] };

        // 🧠 Create a permanent cache key based on query name
        const cacheKey = `recommendations_${queryName.toLowerCase().replace(/\s+/g, '_')}`;
        const cached = localStorage.getItem(cacheKey);

        // ✅ Always prefer cache if it exists
        if (cached) {
            try {
                const parsed = JSON.parse(cached);
                console.log(`Using cached recommendations for "${queryName}"`);
                return { recommendations: parsed.data, videos: parsed.videos || [] };
            } catch {
                localStorage.removeItem(cacheKey); // fallback for malformed cache
            }
        }

        // 1️⃣ Ask Gemini for Indian brand alternatives
        let brandList: any[] = [];
        try {
            const prompt = `
            You are a food and nutrition expert helping users find practical, healthier alternatives.

            Given a product name, suggest up to 4 **Indian brand alternatives** that make a similar but healthier product.
            Only include products that are **commonly listed and available on Amazon India**.

            Each entry should have a known, market-available brand name that users can realistically find online.

            Return strictly valid JSON in this exact format:
            {
            "recommendations": [
                { "name": "<product name or variant>", "brand": "<brand name>" }
            ]
            }

            Product name: "${queryName}"
            User preferences: ${JSON.stringify(userPreferences || {})}

            Ensure:
            - Every brand is available on Amazon India (amazon.in).
            - Prefer healthier or organic alternatives if available.
            `;


            const response = await this.ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt
            });

            const text = response.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
            const cleaned = text.replace(/```json|```/g, '').trim();
            const parsed = JSON.parse(cleaned);

            if (Array.isArray(parsed.recommendations)) {
                brandList = parsed.recommendations.slice(0, 5);
            }
        } catch (err) {
            console.warn('Gemini brand discovery failed', err);
            brandList = [];
        }

        if (!brandList.length) {
            return { recommendations: [] };
        }

        // 2️⃣ Fetch product info from Amazon India via RapidAPI
        const recommendations: any[] = [];

        for (const b of brandList) {
            const searchTerm = `${b.brand} ${b.name}`.trim();
            const apiUrl = `https://real-time-amazon-data.p.rapidapi.com/search?query=${encodeURIComponent(
                searchTerm
            )}&country=IN`;

            try {
                const res = await fetch(apiUrl, {
                    method: 'GET',
                    headers: {
                        'x-rapidapi-key': environment.rapidApiKey,
                        'x-rapidapi-host': 'real-time-amazon-data.p.rapidapi.com'
                    },
                    cache: 'no-store'
                });

                if (!res.ok) continue;
                const data = await res.json();
                const product = data.data?.products?.[0]; // take first valid result

                if (product) {
                    recommendations.push({
                        name: product.title || b.name,
                        brand: b.brand,
                        image: product.product_photo || product.product_photo,
                        url: product.asin
                            ? `https://www.amazon.in/dp/${product.asin}`
                            : product.url || '#',
                        price: product.price?.current_price
                            ? `₹${product.price.current_price}`
                            : product.price || 'N/A',
                        rating: product.rating || '—',
                        reason: `Indian alternative from ${b.brand} available on Amazon India`
                    });
                }
            } catch (err) {
                console.warn(`Amazon RapidAPI fetch failed for ${b.brand}`, err);
            }
        }

        const videos: any[] = [];
        try {
            const youtubeQuery = `healthy alternatives to ${queryName} India`;
            const ytUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=3&q=${encodeURIComponent(
                youtubeQuery
            )}&type=video&key=${environment.youtubeApiKey}`;

            const ytRes = await fetch(ytUrl);
            if (ytRes.ok) {
                const ytData = await ytRes.json();
                for (const item of ytData.items || []) {
                    videos.push({
                        title: item.snippet.title,
                        channel: item.snippet.channelTitle,
                        thumbnail: item.snippet.thumbnails.medium.url,
                        url: `https://www.youtube.com/watch?v=${item.id.videoId}`
                    });
                }
            }
        } catch (err) {
            console.warn('YouTube API failed', err);
        }


        // 3️⃣ Cache results permanently (no expiration)
        try {
            const payload = { data: recommendations, videos };
            localStorage.setItem(cacheKey, JSON.stringify(payload));
            console.log(`Cached permanently for "${queryName}"`);
        } catch (err) {
            console.warn('Failed to store permanent cache', err);
        }

        return { recommendations, videos };
    }





}
