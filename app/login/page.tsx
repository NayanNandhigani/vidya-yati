import LoginForm from "./LoginForm";

export default function LoginPage() {
  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--paper)",
        padding: 24,
      }}
    >
      <div className="card" style={{ width: "100%", maxWidth: 380, padding: 32 }}>
        <h1 className="disp" style={{ fontSize: 24, margin: "0 0 4px" }}>
          Vidya Yati
        </h1>
        <p style={{ margin: "0 0 24px", fontSize: 13.5, color: "var(--muted)" }}>
          Sign in to your school's admin, staff, or parent portal.
        </p>
        <LoginForm />
      </div>
    </main>
  );
}
