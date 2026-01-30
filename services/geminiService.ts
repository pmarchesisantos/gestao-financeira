
import { GoogleGenAI, Type } from "@google/genai";
import { FinanceAnalysis, FinanceItem, Category } from "../types";

const generateSystemInstruction = (maxCompromise: number) => `
Você é o "Master Finance", assistente de gestão de fluxo de caixa.
Sua função é analisar dados financeiros e gerar um Resumo Executivo e Status de Saúde.

LOGICA DE CÁLCULO RIGOROSA:
1. Gasto Total = Soma de todos os itens de saída (expenses).
2. Entradas (Trabalho) = Itens de entrada (income). Representa o salário líquido.
3. Entradas (Terceiros) = Itens neutros (neutral). Tratadas como compensação. NÃO somar como renda disponível.
4. Percentual de Comprometimento = Gasto Total / Entradas (Trabalho). 
   IMPORTANTE: Retorne este valor SEMPRE como um decimal (ex: 0.7014 para 70.14%).
5. LIMITE DE SEGURANÇA: O usuário definiu que o limite ideal de gastos é ${(maxCompromise * 100).toFixed(0)}% da renda.
6. ALERTA DE RISCO: Se o comprometimento for maior que ${(maxCompromise * 100).toFixed(0)}%, o campo 'alertMessage' DEVE conter o aviso de risco. Se for menor, o campo deve ser estritamente null.

STATUS:
- Saudável: Comprometimento <= ${(maxCompromise * 0.7).toFixed(2)}
- Atenção: Comprometimento > ${(maxCompromise * 0.7).toFixed(2)} e <= ${maxCompromise.toFixed(2)}
- Crítico: Comprometimento > ${maxCompromise.toFixed(2)}

TOM DE VOZ: Profissional, direto, objetivo e levemente analítico.
RETORNE APENAS JSON.
`;

export async function analyzeFinanceData(items: FinanceItem[], categories: Category[], maxCompromise: number): Promise<FinanceAnalysis> {
  // Always initialize GoogleGenAI directly using the API_KEY from environment variables
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const incomeCats = categories.filter(c => c.type === 'income').map(c => c.id);
  const expenseCats = categories.filter(c => c.type === 'expense').map(c => c.id);

  const income = items.filter(i => incomeCats.includes(i.category)).reduce((a, b) => a + b.value, 0);
  const expenses = items.filter(i => expenseCats.includes(i.category)).reduce((a, b) => a + b.value, 0);
  const expectedRatio = income > 0 ? expenses / income : (expenses > 0 ? 1 : 0);

  const prompt = `Analise estes dados: ${JSON.stringify(items)}. O Gasto Total é ${expenses} e a Renda é ${income}. Calcule o comprometimento exato baseado no limite de ${maxCompromise}.`;
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: prompt,
    config: {
      systemInstruction: generateSystemInstruction(maxCompromise),
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
              alertMessage: { type: Type.STRING }
            },
            required: ["totalWorkIncome", "totalExpenses", "remainingBalance", "compromisePercentage", "status"],
          }
        },
        required: ["summary"]
      }
    }
  });

  // Directly access the text property as per guidelines (do not use .text())
  const data = JSON.parse(response.text.trim());
  
  // Sanitização rigorosa de strings de alerta
  const alert = data.summary.alertMessage;
  if (!alert || String(alert).toLowerCase().trim() === 'null' || String(alert).trim() === '') {
    data.summary.alertMessage = null;
  }

  const aiVal = data.summary.compromisePercentage;
  
  if (expectedRatio > 0) {
    const diffToRatio = Math.abs(aiVal - expectedRatio);
    const diffToPercentage = Math.abs((aiVal / 100) - expectedRatio);
    if (diffToPercentage < diffToRatio && aiVal > 1) {
      data.summary.compromisePercentage = aiVal / 100;
    }
  } else if (aiVal > 1 && expenses <= income) {
      data.summary.compromisePercentage = aiVal / 100;
  }

  return {
    ...data,
    analysisDate: new Date().toLocaleDateString('pt-BR')
  };
}

export async function parseNaturalLanguage(text: string, categories: Category[]): Promise<Partial<FinanceItem>[]> {
  // Always initialize GoogleGenAI directly using the API_KEY from environment variables
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const categoryInstructions = categories.map(c => `${c.id} (${c.name})`).join(", ");

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Extraia os dados deste texto: "${text}". Categorias permitidas: ${categoryInstructions}`,
    config: {
      systemInstruction: "Extraia itens financeiros e categorize-os corretamente baseado nas categorias fornecidas.",
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            description: { type: Type.STRING },
            value: { type: Type.NUMBER },
            category: { type: Type.STRING },
            paidInstallments: { type: Type.NUMBER },
            totalInstallments: { type: Type.NUMBER },
          },
          required: ["description", "value", "category"]
        }
      }
    }
  });
  // Directly access the text property as per guidelines (do not use .text())
  return JSON.parse(response.text.trim());
}
