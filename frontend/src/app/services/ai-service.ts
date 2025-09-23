// src/app/services/ai.service.ts
import { Injectable } from '@angular/core';
import { environment } from '../../environment/environment';
import { productInfo } from '../core/model/product.model';
import { GoogleGenAI } from "@google/genai";

@Injectable({
    providedIn: 'root'
})
export class AiService {

    private ai = new GoogleGenAI({ apiKey: "AIzaSyB7g9br7w8Cx71kTxMMuty1kKqZUd-CrBI" });

    constructor() { }


    async analyzeProduct(productInfo: productInfo) {
        const ingredientDetails = (productInfo.product.ingredients || []).map(i => ({
            name: i.ingredients_text || i.id || "Unknown",
            percentEstimate: i.percent_estimate || null,
            type: null, // let AI fill: safe/caution/avoid
            dietaryInfo: i.ingredients_analysis_tags || [], // vegan, vegetarian, palm-oil-free, etc.
            knownAdditives: i.additives_tags || [], // e150d, e338...
            allergens: i.allergens_tags || [],
            subIngredients: i.has_sub_ingredients === "yes" ? i.sub_ingredients : []
        }));


        let ingredientsInfo = ingredientDetails.length
            ? JSON.stringify(ingredientDetails)
            : `Ingredients not available. Use the following product info: nutrients, additives, labels, category, and brand.`;

        const product = productInfo.product;
        const prompt = `
            You are a nutrition expert. 
            Analyze this product and classify each ingredient as safe/caution/avoid, give diet badges, summarize nutritional risks, and list potential conflicts with the user's diet or health concerns. Return only JSON.
            Return JSON ONLY.

            Rules:
            - "nutrients.percent" must always be a number between 0–100.
            - If exact % cannot be determined, return null (not 0).
            - "levelColor" must be one of: "primary" (healthy/low), "accent" (moderate), "warn" (high).
            - Do not leave any required field blank.

            Product: ${product.product_name}
            Brand: ${product.brands}
            Ingredients: ${ingredientsInfo}
            Nutrients: ${JSON.stringify(product.nutrient_levels || {})}
            Allergens: ${product.allergens || 'None'}
            User preferences: ${JSON.stringify(productInfo.userPreferences)}

            Return JSON with:
            {
            "score": 0-100,
            "color": "primary|accent|warn",
            "advice": "Recommended to User or not based on User Preference.",
            "nutrients": [{"name":"...","percent":0-100 or null,"levelColor":"primary|accent|warn"}],
            "dietBadges": [{"label":"...","type":"ok|warn|avoid"}],
            "ingredients": [{"name":"...","type":"safe|caution|avoid"}],
            "alerts": ["list of conflicts"],
            "summary": "Plain-language summary",
            "alternatives": ["optional list of healthier products"]
            }
            `;


        //console.log(prompt);

        const response = await this.ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
        });

        const aiText = response.candidates[0].content.parts[0].text || '{}';

        try {
            return JSON.parse(aiText);
        } catch {
            const match = aiText.match(/\{.*\}/s);
            if (match) return JSON.parse(match[0]);
            throw new Error('Invalid AI JSON response');
        }
    }
}
