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
    { role: 'ai', text: 'Hello! I am your Nexus Warehouse Assistant. Need help analyzing stock or drafting emails?' }
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
    <div className="max-w-4xl mx-auto h-[calc(100vh-140px)] flex flex-col glass-card rounded-3xl shadow-glass border border-white/20 overflow-hidden animate-fade-in">
      <div className="p-5 border-b border-slate-200/50 dark:border-slate-800/50 bg-gradient-to-r from-indigo-600 to-purple-600 text-white flex justify-between items-center shadow-lg">
        <div className="flex items-center gap-4">
            <div className="p-2 bg-white/20 rounded-2xl backdrop-blur-md">
                <Bot size={28} strokeWidth={2.5} />
            </div>
            <div>
                <h3 className="font-black tracking-tight text-lg">Nexus Intelligence</h3>
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">Gemini 3 Flash Powered</p>
            </div>
        </div>
        <button 
            onClick={handleQuickAction}
            className="text-[10px] font-black uppercase tracking-widest bg-white text-indigo-600 px-4 py-2 rounded-xl shadow-lg hover:bg-indigo-50 transition-all active:scale-95 flex items-center gap-2"
        >
            <Sparkles size={14} className="fill-indigo-600" /> Executive Report
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-white/30 dark:bg-slate-900/10">
        {messages.map((m, idx) => (
          <div key={idx} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-slide-up`}>
            <div className={`flex gap-4 max-w-[85%] ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg ${m.role === 'user' ? 'bg-primary text-white' : 'bg-emerald-500 text-white'}`}>
                {m.role === 'user' ? <UserIcon size={18} strokeWidth={2.5} /> : <Bot size={18} strokeWidth={2.5} />}
              </div>
              <div className={`p-5 rounded-3xl text-sm leading-relaxed whitespace-pre-line shadow-glass backdrop-blur-md ${
                  m.role === 'user' 
                  ? 'bg-primary text-white rounded-tr-none' 
                  : 'bg-white/80 dark:bg-slate-800/80 text-slate-800 dark:text-slate-100 border border-slate-100/50 dark:border-slate-700/50 rounded-tl-none font-medium'
              }`}>
                {m.text}
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="flex gap-3 bg-white/80 dark:bg-slate-800/80 p-5 rounded-3xl rounded-tl-none border border-slate-100/50 dark:border-slate-700/50 shadow-glass items-center">
                <Loader2 size={18} className="animate-spin text-primary" />
                <span className="text-xs font-black uppercase tracking-widest text-slate-400">Processing...</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="p-6 bg-white/50 dark:bg-slate-900/50 border-t border-slate-200/50 dark:border-slate-800/50 backdrop-blur-xl">
        <div className="flex gap-4">
          <input
            type="text"
            className="flex-1 bg-white/70 dark:bg-slate-800/70 border border-slate-200/50 dark:border-slate-700/50 rounded-2xl px-6 py-4 focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all font-medium text-sm placeholder:text-slate-400"
            placeholder="Ask about inventory, value, or draft an email..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          />
          <button 
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="bg-primary hover:bg-blue-600 text-white p-4 rounded-2xl transition-all shadow-xl shadow-primary/20 disabled:opacity-30 active:scale-90"
          >
            <Send size={24} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  );
};