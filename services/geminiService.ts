
import { GoogleGenAI, Type } from "@google/genai";
import { FinanceAnalysis, FinanceItem } from "../types";

const SYSTEM_INSTRUCTION_ANALYSIS = `
Você é o "Master Finance", assistente de gestão de fluxo de caixa.
Sua função é analisar dados financeiros e gerar um Resumo Executivo e Status de Saúde.

LOGICA DE CÁLCULO RIGOROSA:
1. Gasto Total = Soma de 'house' (Casa) + 'fixed' (Mensais).
2. Entradas (Trabalho) = Categoria 'work'. Representa o salário líquido.
3. Entradas (Terceiros) = Categoria 'thirdParty'. Tratadas como compensação. NÃO somar como renda disponível.
4. Percentual de Comprometimento = Gasto Total / Entradas (Trabalho). 
   IMPORTANTE: Retorne este valor SEMPRE como um decimal (ex: 0.7014 para 70.14% ou 5.0 para 500%).
5. ALERTA DE RISCO: Se Gasto Total > 80% das Entradas (Trabalho), o campo 'alertMessage' DEVE conter o aviso de risco.

STATUS:
- Saudável: Comprometimento <= 0.5
- Atenção: Comprometimento > 0.5 e <= 0.8
- Crítico: Comprometimento > 0.8

TOM DE VOZ: Profissional, direto, objetivo e levemente analítico.
RETORNE APENAS JSON.
`;

const SYSTEM_INSTRUCTION_PARSER = `
Você é o processador de dados do "Master Finance".
Extraia itens financeiros de texto natural e categorize-os em: house, fixed, work, thirdParty.
`;

export async function parseNaturalLanguage(text: string): Promise<Partial<FinanceItem>[]> {
  // Create a new GoogleGenAI instance right before making an API call to ensure it uses the correct context.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Extraia os dados deste texto: "${text}"`,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION_PARSER,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            description: { type: Type.STRING },
            value: { type: Type.NUMBER },
            category: { 
              type: Type.STRING, 
              description: "The category of the expense: 'house', 'fixed', 'work', or 'thirdParty'." 
            },
            paidInstallments: { 
              type: Type.NUMBER, 
              description: "Number of installments already paid (optional)." 
            },
            totalInstallments: { 
              type: Type.NUMBER, 
              description: "Total number of installments (optional)." 
            },
          },
          required: ["description", "value", "category"],
          propertyOrdering: ["description", "value", "category", "paidInstallments", "totalInstallments"]
        }
      }
    }
  });
  return JSON.parse(response.text.trim());
}

export async function analyzeFinanceData(items: FinanceItem[]): Promise<FinanceAnalysis> {
  // Create a new GoogleGenAI instance right before making an API call to ensure it uses the correct context.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const income = items.filter(i => i.category === 'work').reduce((a, b) => a + b.value, 0);
  const expenses = items.filter(i => i.category === 'house' || i.category === 'fixed').reduce((a, b) => a + b.value, 0);
  const expectedRatio = income > 0 ? expenses / income : (expenses > 0 ? 1 : 0);

  const prompt = `Analise estes dados: ${JSON.stringify(items)}. O Gasto Total é ${expenses} e a Renda Trabalho é ${income}. Calcule o comprometimento exato.`;
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: prompt,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION_ANALYSIS,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          summary: {
            type: Type.OBJECT,
            properties: {
              totalWorkIncome: { type: Type.NUMBER },
              totalExpenses: { type: Type.NUMBER },
              remainingBalance: { type: Type.NUMBER },
              compromisePercentage: { type: Type.NUMBER, description: "Ratio decimal (ex: 0.75 for 75%)" },
              status: { type: Type.STRING },
              alertMessage: { type: Type.STRING, description: "Risk warning message if any, or an empty string." }
            },
            required: ["totalWorkIncome", "totalExpenses", "remainingBalance", "compromisePercentage", "status"],
            propertyOrdering: ["totalWorkIncome", "totalExpenses", "remainingBalance", "compromisePercentage", "status", "alertMessage"]
          }
        },
        required: ["summary"]
      }
    }
  });

  const data = JSON.parse(response.text.trim());
  
  // Normalização Inteligente de Escala:
  // Se a IA retornar 70.14 para um ratio de 0.7014, nós detectamos a diferença de 100x
  const aiVal = data.summary.compromisePercentage;
  
  if (expectedRatio > 0) {
    const diffToRatio = Math.abs(aiVal - expectedRatio);
    const diffToPercentage = Math.abs((aiVal / 100) - expectedRatio);
    
    // Se dividir por 100 aproxima o valor do ratio esperado muito mais do que o valor original, corrigimos.
    if (diffToPercentage < diffToRatio && aiVal > 1) {
      data.summary.compromisePercentage = aiVal / 100;
    }
  } else if (aiVal > 1 && expenses <= income) {
      // Fallback básico para segurança
      data.summary.compromisePercentage = aiVal / 100;
  }

  return {
    ...data,
    analysisDate: new Date().toLocaleDateString('pt-BR')
  };
}
