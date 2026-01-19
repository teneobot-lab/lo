
import React, { useState, useRef, useEffect } from 'react';
import { geminiService } from '../services/geminiService';
import { InventoryItem, Transaction } from '../types';
import { Send, Bot, User as UserIcon, Loader2, Sparkles } from 'lucide-react';

interface AIProps {
  inventory: InventoryItem[];
  transactions: Transaction[];
}

export const AIAssistant: React.FC<AIProps> = ({ inventory, transactions }) => {
  const [messages, setMessages] = useState<{role: 'user' | 'ai', text: string}[]>([
    { role: 'ai', text: 'Hello! I am your Nexus Warehouse Assistant. Ask me about your stock levels, valuation, or need help writing a supplier email?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const userMsg = input;
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setInput('');
    setLoading(true);

    const response = await geminiService.askAssistant(userMsg, inventory, transactions);
    
    setMessages(prev => [...prev, { role: 'ai', text: response }]);
    setLoading(false);
  };

  const handleQuickAction = async () => {
      setMessages(prev => [...prev, { role: 'user', text: "Generate executive insight report." }]);
      setLoading(true);
      const report = await geminiService.generateInsights(inventory);
      setMessages(prev => [...prev, { role: 'ai', text: report }]);
      setLoading(false);
  }

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-140px)] flex flex-col bg-white dark:bg-gray-800 rounded-2xl shadow-soft border border-slate-100 dark:border-gray-700 overflow-hidden transition-colors">
      {/* Header */}
      <div className="p-4 border-b border-border dark:border-gray-700 bg-gradient-to-r from-indigo-600 to-purple-600 text-white flex justify-between items-center">
        <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-full">
                <Bot size={24} />
            </div>
            <div>
                <h3 className="font-bold">Nexus AI Assistant</h3>
                <p className="text-xs text-indigo-100">Powered by Gemini 3 Flash</p>
            </div>
        </div>
        <button 
            onClick={handleQuickAction}
            className="text-xs bg-white text-indigo-600 px-3 py-1.5 rounded-full font-bold shadow hover:bg-indigo-50 flex items-center gap-1"
        >
            <Sparkles size={12} /> Generate Insights
        </button>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#F8FAFC] dark:bg-gray-900">
        {messages.map((m, idx) => (
          <div key={idx} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex gap-3 max-w-[80%] ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${m.role === 'user' ? 'bg-primary text-white' : 'bg-emerald-500 text-white'}`}>
                {m.role === 'user' ? <UserIcon size={16} /> : <Bot size={16} />}
              </div>
              <div className={`p-4 rounded-2xl text-sm leading-relaxed whitespace-pre-line shadow-sm ${
                  m.role === 'user' 
                  ? 'bg-primary text-white rounded-tr-none' 
                  : 'bg-white dark:bg-gray-800 text-dark dark:text-gray-200 border border-slate-100 dark:border-gray-700 rounded-tl-none'
              }`}>
                {m.text}
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="flex gap-3 bg-white dark:bg-gray-800 p-4 rounded-2xl rounded-tl-none border border-slate-100 dark:border-gray-700 shadow-sm items-center">
                <Loader2 size={18} className="animate-spin text-primary" />
                <span className="text-xs text-muted dark:text-gray-400">Thinking...</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white dark:bg-gray-800 border-t border-border dark:border-gray-700">
        <div className="flex gap-2">
          <input
            type="text"
            className="flex-1 border border-border dark:border-gray-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20 bg-slate-50 dark:bg-gray-900 dark:text-white"
            placeholder="Ask about inventory, value, or draft an email..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          />
          <button 
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="bg-primary hover:bg-blue-600 text-white p-3 rounded-xl transition-colors shadow-lg shadow-blue-500/20 disabled:opacity-50"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};
