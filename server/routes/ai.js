import { Router } from "express";
import { verifyToken } from "../middleware/verifyToken.js";

const router = Router();

// Endpoint for AI Code Review
router.post("/ai/review", verifyToken, async (req, res) => {
  const { code, language } = req.body;
  if (!code) {
    return res.status(400).json({ error: "No code provided." });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.startsWith("your_gemini")) {
    return res.status(400).json({
      error: "Gemini API Key is not configured. Please add GEMINI_API_KEY=your_key to server/.env file."
    });
  }

  const systemPrompt = `You are an expert AI Code Reviewer. Analyze the following code and return a response in strictly valid JSON format.
Do not include any markdown formatting like \`\`\`json or \`\`\` backticks in the response. Return ONLY the raw JSON object.
The JSON object must match this schema:
{
  "codeSummary": "string describing what the code does",
  "bugs": ["array of strings showing bugs found, or empty array if none"],
  "bestPractices": ["array of best practice suggestions"],
  "optimizations": ["array of optimization suggestions"],
  "timeComplexity": "estimated time complexity, e.g. O(n)",
  "spaceComplexity": "estimated space complexity, e.g. O(1)"
}`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `${systemPrompt}\n\nLanguage: ${language || "javascript"}\n\nCode:\n${code}`
                }
              ]
            }
          ]
        })
      }
    );

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({ error: data.error?.message || "Gemini API error" });
    }

    let responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    
    // Clean markdown backticks if returned
    if (responseText.includes("```json")) {
      responseText = responseText.split("```json")[1].split("```")[0];
    } else if (responseText.includes("```")) {
      responseText = responseText.split("```")[1].split("```")[0];
    }

    try {
      const parsedReview = JSON.parse(responseText.trim());
      res.json(parsedReview);
    } catch (parseError) {
      console.error("Gemini JSON Parse Error. Raw output:", responseText);
      res.status(500).json({ error: "Failed to parse AI review output as structured JSON. Raw: " + responseText });
    }
  } catch (error) {
    console.error("AI Review error:", error);
    res.status(500).json({ error: "Failed to compile AI code review." });
  }
});

// Endpoint for Code Complexity Analysis
router.post("/ai/complexity", verifyToken, async (req, res) => {
  const { code, language } = req.body;
  if (!code) {
    return res.status(400).json({ error: "No code provided." });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.startsWith("your_gemini")) {
    return res.status(400).json({
      error: "Gemini API Key is not configured. Please add GEMINI_API_KEY=your_key to server/.env file."
    });
  }

  const systemPrompt = `You are an expert Code Complexity Analyzer. Analyze the following ${language || "javascript"} code and return a response in strictly valid JSON format.
Do not include any markdown formatting like \`\`\`json or \`\`\` backticks in the response. Return ONLY the raw JSON object.
The JSON object must match this schema:
{
  "timeComplexity": "estimated time complexity, e.g. O(n)",
  "spaceComplexity": "estimated space complexity, e.g. O(1)",
  "loops": 0,
  "nestedLoops": 0,
  "functions": 0,
  "recursiveCalls": 0,
  "explanation": "concise, simple text explaining the complexity estimation in simple terms"
}
Note: Loops include for, while, do-while. Nested loops include loops inside loops. Functions include declared functions/methods. Recursive calls are functions calling themselves.`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `${systemPrompt}\n\nCode:\n${code}`
                }
              ]
            }
          ]
        })
      }
    );

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({ error: data.error?.message || "Gemini API error" });
    }

    let responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    
    // Clean markdown backticks if returned
    if (responseText.includes("```json")) {
      responseText = responseText.split("```json")[1].split("```")[0];
    } else if (responseText.includes("```")) {
      responseText = responseText.split("```")[1].split("```")[0];
    }

    try {
      const parsedComplexity = JSON.parse(responseText.trim());
      res.json(parsedComplexity);
    } catch (parseError) {
      console.error("Gemini JSON Parse Error. Raw output:", responseText);
      res.status(500).json({ error: "Failed to parse complexity analysis as structured JSON. Raw: " + responseText });
    }
  } catch (error) {
    console.error("AI Complexity error:", error);
    res.status(500).json({ error: "Failed to analyze code complexity." });
  }
});

export default router;
