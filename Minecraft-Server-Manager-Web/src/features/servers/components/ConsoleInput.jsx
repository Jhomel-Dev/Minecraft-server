"use client";
import { useState } from "react";
import { Terminal, Send } from "lucide-react";

export function ConsoleInput({ onSend, disabled }) {
  const [command, setCommand] = useState("");

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!command.trim()) return;
    
    onSend(command);
    setCommand("");
  };

  return (
    <form 
      onSubmit={handleSubmit}
      className="bg-surface flex items-center gap-2 p-3 rounded-b-blocky border-2 border-surface-border shadow-md"
    >
      <Terminal className="w-5 h-5 text-foreground/50 ml-2 shrink-0" />
      <input
        type="text"
        value={command}
        onChange={(e) => setCommand(e.target.value)}
        disabled={disabled}
        placeholder={disabled ? "Conectando..." : "Ejecuta un comando (ej. /say Hola a todos)"}
        className="flex-1 bg-transparent border-none outline-none font-mono text-foreground placeholder-foreground/40 px-2"
        autoComplete="off"
        spellCheck="false"
      />
      <button 
        type="submit" 
        disabled={disabled || !command.trim()}
        className="p-2 text-primary hover:bg-primary/10 rounded-blocky transition-colors disabled:opacity-50"
      >
        <Send className="w-5 h-5" />
      </button>
    </form>
  );
}
