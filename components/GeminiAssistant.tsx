import React, { useState } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Sparkles, X, Send, Copy, Loader2 } from 'lucide-react';

interface GeminiAssistantProps {
  onClose: () => void;
  isOpen: boolean;
}

export const GeminiAssistant: React.FC<GeminiAssistantProps> = ({ onClose, isOpen }) => {
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setResponse('');

    try {
      const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || '';
      if (!apiKey) {
         setResponse("API Key is missing. Please configure the environment.");
         setLoading(false);
         return;
      }

      const ai = new GoogleGenAI({ apiKey });
      const model = 'gemini-3-flash-preview';

      const result = await ai.models.generateContent({
        model,
        contents: `You are an AI assistant for a high-end residential society management system.
        Draft a formal, polite, and clear announcement for residents based on the following topic: "${prompt}".
        Keep it concise (under 150 words) and professional.`,
      });

      setResponse(result.text || 'No response generated.');
    } catch (error) {
      console.error("Gemini Error:", error);
      setResponse("Sorry, I couldn't generate the announcement at this time. Please check your network or API key.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-brand-600 p-4 flex justify-between items-center text-white">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-yellow-300" />
            <h3 className="font-semibold text-lg">Society AI Assistant</h3>
          </div>
          <button onClick={onClose} className="hover:bg-brand-700 p-1 rounded-full transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex-1 overflow-y-auto">
          <p className="text-sm text-gray-500 mb-4">
            Ask me to draft maintenance notices, event invitations, or payment reminders.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                What should the announcement be about?
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="E.g., The swimming pool will be closed for maintenance on Tuesday..."
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none resize-none h-24 text-sm"
              />
            </div>

            <button
              onClick={handleGenerate}
              disabled={loading || !prompt}
              className="w-full bg-brand-600 text-white py-2 rounded-lg font-medium hover:bg-brand-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Generate Draft
            </button>

            {response && (
              <div className="mt-6 bg-brand-50 p-4 rounded-xl border border-brand-100">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="text-sm font-semibold text-brand-900">Generated Draft:</h4>
                  <button
                    onClick={() => navigator.clipboard.writeText(response)}
                    className="text-brand-600 hover:text-brand-800 p-1"
                    title="Copy to clipboard"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {response}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
