"use client";
import { useState } from "react";
import { Input } from "@/shared/ui/Input";
import { Button } from "@/shared/ui/Button";
import { User, Save } from "lucide-react";

export function ProfileForm() {
  const [username, setUsername] = useState("jhomel");

  const handleSubmit = (event) => {
    event.preventDefault();
  };

  return (
    <form onSubmit={handleSubmit} className="bg-surface p-6 rounded-blocky border-2 border-surface-border shadow-sm flex flex-col gap-4">
      <div className="flex items-center gap-4 mb-4">
        <div className="w-16 h-16 bg-primary/20 rounded-blocky flex items-center justify-center text-primary border-2 border-primary">
          <User className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Información Personal</h2>
          <p className="text-foreground/60 text-sm">Actualiza tu apodo en el panel.</p>
        </div>
      </div>

      <div>
        <label className="font-bold block mb-2">Nombre de Usuario</label>
        <Input 
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
      </div>

      <div className="flex justify-end mt-2">
        <Button type="submit">
          <Save className="w-4 h-4 mr-2 inline-block" /> Guardar Cambios
        </Button>
      </div>
    </form>
  );
}
