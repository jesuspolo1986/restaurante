/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from "react";
import { Send, Bot, Sparkles, User, RefreshCw, ChevronRight } from "lucide-react";
import { motion } from "motion/react";
import Markdown from "react-markdown";
import { apiFetch } from "../utils/api";

interface Message {
  sender: "user" | "elena";
  text: string;
}

export default function ElenaAI() {
  const [messages, setMessages] = useState<Message[]>([
    { sender: "elena", text: "¡Hola! Soy Elena AI, tu farmacéutica inteligente y co-piloto del negocio Elena PRO. ¿En qué puedo asistirte hoy?\n\nPuedes preguntarme por medicamentos sustitutos genéricos, el estado de inventario, o análisis financieros rápidos." }
  ]);
  const [input, setInput] = useState("");
  const [cargando, setCargando] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, cargando]);

  const enviarMensaje = async (texto: string) => {
    if (!texto.trim() || cargando) return;

    const userMessage: Message = { sender: "user", text: texto };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setCargando(true);

    try {
      const res = await apiFetch("/api/gemini/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: texto })
      });
      const data = await res.json();
      
      if (res.ok && data.text) {
        setMessages(prev => [...prev, { sender: "elena", text: data.text }]);
      } else {
        setMessages(prev => [...prev, { sender: "elena", text: "Disculpe, ocurrió un inconveniente de conexión con el núcleo de inteligencia. Compruebe la clave GEMINI_API_KEY en secrets." }]);
      }
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { sender: "elena", text: "Error de red al intentar conectarme con el asistente." }]);
    } finally {
      setCargando(false);
    }
  };

  const sugerenciasRapidas = [
    "¿Qué medicamentos tienen stock crítico hoy?",
    "Sustitutos recomendados para Acetaminofén o Atamel",
    "Dame un análisis ejecutivo de las finanzas y deudores de hoy",
    "¿Qué medicamentos exentos de IVA tenemos registrados?"
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-180px)] items-stretch">
      {/* Panel Izquierdo: Sugerencias e Introducción */}
      <div className="lg:col-span-4 bg-white border border-slate-100 rounded-[2.5rem] p-6 shadow-sm flex flex-col justify-between">
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-50 pb-3 mb-2">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">Núcleo Elena AI</h3>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed font-medium">
            Elena AI está integrada directamente con el inventario y las cuentas del negocio. Analiza stock crítico, te sugiere medicamentos equivalentes cuando hay desabastecimiento, y resume métricas financieras.
          </p>

          <div className="space-y-2 pt-2">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Consultas Rápidas</h4>
            {sugerenciasRapidas.map((s, idx) => (
              <motion.button
                key={idx}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2, delay: idx * 0.05 }}
                onClick={() => enviarMensaje(s)}
                className="w-full text-left p-3 bg-slate-50 hover:bg-indigo-50 border border-slate-100 hover:border-indigo-100 rounded-2xl text-xs font-semibold text-slate-700 flex items-center justify-between group transition"
              >
                <span>{s}</span>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 shrink-0 ml-2" />
              </motion.button>
            ))}
          </div>
        </div>

        <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-3xl text-[10px] text-indigo-800 leading-relaxed font-semibold">
          💡 <strong>Tip Farmacéutico:</strong> Prueba preguntando: <em>"¿Qué genérico puedo sugerir si un cliente busca Losartán pero no hay stock?"</em>
        </div>
      </div>

      {/* Panel Derecho: Chat Conversacional */}
      <div className="lg:col-span-8 bg-slate-50 border border-slate-100 rounded-[2.5rem] p-6 shadow-inner flex flex-col justify-between overflow-hidden">
        {/* Historial de Diálogo */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-4 mb-4 scrollbar-thin">
          {messages.map((m, idx) => {
            const esElena = m.sender === "elena";
            return (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 15, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className={`flex gap-3 max-w-[85%] ${esElena ? "self-start" : "self-end flex-row-reverse ml-auto"}`}
              >
                {/* Avatar */}
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                  esElena ? "bg-indigo-600 text-white" : "bg-slate-800 text-white"
                }`}>
                  {esElena ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                </div>

                {/* Globo */}
                <div className={`p-4 rounded-[1.75rem] text-xs leading-relaxed ${
                  esElena 
                    ? "bg-white text-slate-700 border border-slate-100 rounded-tl-sm shadow-sm" 
                    : "bg-indigo-600 text-white rounded-tr-sm shadow-md"
                }`}>
                  {esElena ? (
                    <div className="markdown-body text-xs font-medium space-y-1">
                      <Markdown
                        components={{
                          p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
                          strong: ({ children }) => <strong className="font-extrabold text-indigo-900">{children}</strong>,
                          em: ({ children }) => <em className="italic">{children}</em>,
                          ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>,
                          ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>,
                          li: ({ children }) => <li>{children}</li>,
                          h1: ({ children }) => <h1 className="text-sm font-bold text-slate-900 mt-2 mb-1">{children}</h1>,
                          h2: ({ children }) => <h2 className="text-xs font-bold text-slate-900 mt-2 mb-1">{children}</h2>,
                          h3: ({ children }) => <h3 className="text-[11px] font-bold text-slate-900 mt-1 mb-0.5">{children}</h3>,
                          table: ({ children }) => <div className="overflow-x-auto my-2"><table className="min-w-full border-collapse border border-slate-100 text-[11px]">{children}</table></div>,
                          thead: ({ children }) => <thead className="bg-slate-50 text-slate-700 font-bold">{children}</thead>,
                          tbody: ({ children }) => <tbody>{children}</tbody>,
                          tr: ({ children }) => <tr className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">{children}</tr>,
                          th: ({ children }) => <th className="border border-slate-100 px-2 py-1 text-left font-black">{children}</th>,
                          td: ({ children }) => <td className="border border-slate-100 px-2 py-1">{children}</td>,
                        }}
                      >
                        {m.text}
                      </Markdown>
                    </div>
                  ) : (
                    <p className="whitespace-pre-line font-medium leading-relaxed">{m.text}</p>
                  )}
                </div>
              </motion.div>
            );
          })}

          {/* Cargador parpadeante */}
          {cargando && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex gap-3 max-w-[80%] self-start"
            >
              <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center animate-pulse">
                <Bot className="w-4 h-4" />
              </div>
              <div className="p-4 bg-white border border-slate-100 rounded-3xl rounded-tl-sm shadow-sm text-xs font-semibold text-slate-400 flex items-center gap-2">
                <span>Elena está analizando el negocio...</span>
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-500" />
              </div>
            </motion.div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Campo de Entrada de Mensajes */}
        <form 
          onSubmit={(e) => { e.preventDefault(); enviarMensaje(input); }}
          className="flex gap-2 bg-white p-2 rounded-2xl border border-slate-100 shadow-sm"
        >
          <input
            type="text"
            className="flex-1 bg-transparent border-none py-2 px-3 text-xs font-semibold outline-none text-slate-700 placeholder-slate-400"
            placeholder="Consulte al co-piloto del negocio Elena AI..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={cargando}
          />
          <button
            type="submit"
            disabled={!input.trim() || cargando}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-100 disabled:text-slate-400 text-white p-2.5 rounded-xl transition shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
