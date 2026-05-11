const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini API
const getModel = () => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured in environment variables');
  }
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  return genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
};

/**
 * Analyzes an error log using Google Gemini and returns a markdown response
 */
const analyzeError = async (req, res, next) => {
  try {
    const { message, stack_trace, context, environment } = req.body;

    if (!message) {
      return res.status(400).json({ 
        success: false, 
        message: 'Error message is required for analysis' 
      });
    }

    let model;
    try {
      model = getModel();
    } catch (err) {
      return res.status(503).json({
        success: false,
        message: 'AI Assistant is not configured on the server.'
      });
    }

    const prompt = `
You are an expert DevOps engineer and backend developer. 
Analyze the following application error and provide a concise, actionable summary of what went wrong and how to fix it.

Error Message: ${message}
${stack_trace ? `Stack Trace:\n${stack_trace}\n` : ''}
${context ? `Context/Request Info:\n${JSON.stringify(context, null, 2)}\n` : ''}
${environment ? `Environment:\n${JSON.stringify(environment, null, 2)}\n` : ''}

Format your response in Markdown. Structure it as follows:
1. **Root Cause**: A 1-2 sentence explanation of the fundamental issue.
2. **Analysis**: Brief explanation of the technical details.
3. **Proposed Fix**: Code snippets or configuration changes to resolve it.

Do not repeat the raw error message itself, jump straight into the insights. Keep the tone professional, objective, and helpful.
`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    res.json({
      success: true,
      analysis: responseText
    });
  } catch (error) {
    console.error('[AI] Detailed Analysis Error:', error);
    // Log the actual error properties for debugging
    if (error.response) {
      console.error('[AI] Response Error data:', JSON.stringify(error.response, null, 2));
    }
    
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate AI analysis'
    });
  }
};

module.exports = {
  analyzeError
};
