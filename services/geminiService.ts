import { GoogleGenAI } from "@google/genai";
import { ReceiptItem } from "../types";

const parseReceiptImage = async (base64Image: string): Promise<Partial<ReceiptItem>[]> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // Using gemini-3-flash-preview. 
  // We disable strict JSON schema mode (responseSchema) to avoid "JSON mode is not enabled" errors 
  // with multimodal inputs on this model, relying on prompt engineering instead.
  const modelId = "gemini-3-flash-preview";

  const prompt = `
    Analyze this restaurant receipt or order screenshot. 
    Extract a list of individual items and their prices. 
    Ignore the total sum, taxes, or discounts for now, just the line items.
    
    IMPORTANT: Return ONLY a valid JSON array. Do not wrap in markdown code blocks.
    Each object in the array must have:
    - "name": string (item description, keep original language)
    - "price": number (numeric value, e.g., 12.50)
    
    Example output format:
    [{"name": "Fried Rice", "price": 12.5}, {"name": "Coke", "price": 2.0}]
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/png", 
              data: base64Image,
            },
          },
          {
            text: prompt,
          },
        ],
      },
      // Removed responseSchema/responseMimeType to prevent 400 errors
    });

    const text = response.text;
    if (!text) return [];

    let rawItems;
    try {
      // Clean up markdown code blocks if present (e.g., ```json ... ```)
      const jsonString = text.replace(/```json/g, '').replace(/```/g, '').trim();
      
      // Try parsing the cleaned string
      rawItems = JSON.parse(jsonString);
    } catch (e) {
      console.warn("Direct JSON parse failed, attempting regex extraction", text);
      // Fallback: Find something looking like an array [...]
      const match = text.match(/\[[\s\S]*\]/);
      if (match) {
        rawItems = JSON.parse(match[0]);
      } else {
        throw new Error("Could not parse response as JSON");
      }
    }
    
    if (!Array.isArray(rawItems)) {
        throw new Error("AI response was not an array");
    }

    // Add temporary IDs and ensure assignedTo exists
    return rawItems.map((item: any) => ({
      name: item.name || "未知商品",
      price: typeof item.price === 'number' ? item.price : parseFloat(item.price) || 0,
      id: crypto.randomUUID(),
      assignedTo: [],
    }));

  } catch (error) {
    console.error("Error parsing receipt with Gemini:", error);
    throw new Error("分析小票失败，请重试或手动输入。");
  }
};

export { parseReceiptImage };