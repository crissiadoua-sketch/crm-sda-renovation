"use client";

export default function GlobalError({ unstable_retry }: { unstable_retry: () => void }) {
  return (
    <html lang="fr">
      <body style={{ margin: 0, fontFamily: "Arial, sans-serif", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <div style={{ textAlign: "center", padding: "2rem" }}>
          <p style={{ fontSize: "1.125rem", fontWeight: "700", color: "#1e293b", marginBottom: "0.5rem" }}>
            Connexion temporairement indisponible
          </p>
          <p style={{ fontSize: "0.875rem", color: "#64748b", marginBottom: "1.5rem" }}>
            La base de données ne répond pas. Actualisez la page dans quelques secondes.
          </p>
          <button
            onClick={unstable_retry}
            style={{ background: "#1E2F6E", color: "#fff", border: "none", borderRadius: "8px", padding: "10px 24px", fontSize: "0.875rem", fontWeight: "600", cursor: "pointer" }}
          >
            Réessayer
          </button>
        </div>
      </body>
    </html>
  );
}
