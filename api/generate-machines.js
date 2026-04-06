import { GoogleGenAI } from "@google/genai";

export default async function handler(req, res) {
  // Sécurité : on n'accepte que les requêtes POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  try {
    const { gymName } = JSON.parse(req.body);

    // Utilisation de la clé cachée dans Vercel
    const genAI = new GoogleGenAI(process.env.GEMINI_API_KEY);
    
    // MODÈLE GRATUIT UNIQUEMENT
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `Tu es un expert en fitness. Liste environ 30 machines de musculation et exercices typiquement présents dans la salle de sport "${gymName}". 
    Assure-toi de couvrir toutes les catégories. Réponds uniquement avec un tableau JSON d'objets.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    
    res.status(200).json({ text: response.text() });
  } catch (error) {
    console.error("Erreur API:", error);
    res.status(500).json({ error: "Erreur lors de la génération des machines." });
  }
}