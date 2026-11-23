"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { useApp } from "@/components/providers/AppProvider";

export default function ConnexionPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { refreshUser, showToast } = useApp();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Erreur de connexion.");
        return;
      }
      await refreshUser();
      showToast("Connexion réussie !");
      const roles: string[] = data.user?.roles || [];
      const isAdmin = roles.some(
        (r) => r === "SUPER_ADMIN" || r === "ADMIN" || r === "EDITOR"
      );
      router.push(isAdmin ? "/admin" : "/compte/bibliotheque");
    } catch {
      setError("Serveur inaccessible.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-xl space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-navy-950 text-gold-500 flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <h1 className="font-serif text-2xl font-bold text-navy-950">Connexion</h1>
          <p className="text-xs text-slate-500">
            Accédez à votre compte et à votre bibliothèque numérique.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm"
              placeholder="vous@exemple.com"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Mot de passe</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p role="alert" className="text-xs text-rose-600 font-medium">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gold-500 text-navy-950 font-bold text-sm hover:bg-gold-600 transition cursor-pointer"
          >
            {loading ? "Connexion..." : "Se connecter"}
          </button>
        </form>

        <p className="text-center text-xs text-slate-500">
          Pas encore de compte ?{" "}
          <Link href="/inscription" className="text-navy-950 font-bold hover:underline">
            Créer un compte
          </Link>
        </p>
      </div>
    </div>
  );
}

