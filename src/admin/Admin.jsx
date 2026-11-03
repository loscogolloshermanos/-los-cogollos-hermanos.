import { useEffect, useState } from "react";
import { ArrowLeft, Mail, LogOut, LockKeyhole, RefreshCw } from "lucide-react";
import { supabase, publicSupabase, loginRedirect } from "../services/supabase";
import { explainError } from "../utils/documento";
import Editor from "./Editor";
import "./admin.css";
export default function Admin() {
  const [session, setSession] = useState(null);
  const [ready, setReady] = useState(false);
  const [access, setAccess] = useState("checking");
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let live = true;
    const authError = new URLSearchParams(window.location.hash.slice(1)).get(
      "error_description",
    );
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, next) => {
      if (live) {
        setSession(next);
        setReady(true);
      }
    });
    supabase.auth
      .getSession()
      .then(({ data, error: e }) => {
        if (!live) return;
        setSession(data.session);
        setReady(true);
        if (e || authError) setError(explainError(e || { message: authError }));
        window.history.replaceState(
          null,
          "",
          `${window.location.pathname}#/admin`,
        );
      })
      .catch((e) => {
        if (live) {
          setError(explainError(e));
          setReady(true);
        }
      });
    return () => {
      live = false;
      subscription.unsubscribe();
    };
  }, []);
  const userId = session?.user?.id;
  useEffect(() => {
    if (!ready) return;
    if (!userId) {
      setAccess("signedout");
      return;
    }
    let live = true;
    setAccess("checking");
    async function verify() {
      try {
        const { data, error: e } = await supabase.auth.getUser();
        if (e) throw e;
        if (!data.user?.id) {
          if (live) setAccess("denied");
          return;
        }
        const { data: allowed, error: policyError } =
          await supabase.rpc("lch_is_admin");
        if (policyError) throw policyError;
        if (live) setAccess(allowed ? "allowed" : "denied");
      } catch (e) {
        if (live) {
          setError(explainError(e));
          setAccess("error");
        }
      }
    }
    verify();
    return () => {
      live = false;
    };
  }, [userId, ready, attempt]);
  async function logout() {
    const { error: e } = await supabase.auth.signOut({ scope: "local" });
    if (e) throw e;
    setSession(null);
    setError("");
  }
  if (access === "allowed") return <Editor onLogout={logout} />;
  return (
    <main className="admin-shell auth-shell">
      <a className="admin-back" href="#inicio">
        <ArrowLeft size={16} /> Volver a la web
      </a>
      <section className="auth-card">
        <div className="auth-lock">
          <LockKeyhole size={28} />
        </div>
        <span className="eyebrow">LOS COGOLLOS HERMANOS</span>
        <h1>Tu espacio privado.</h1>
        {access === "checking" ? (
          <p role="status">Verificando el acceso…</p>
        ) : access === "signedout" ? (
          <Login initialError={error} />
        ) : (
          <>
            <div className="admin-alert" role="alert">
              {access === "denied"
                ? "Esta cuenta no tiene acceso al panel. Entra con el correo autorizado."
                : error}
            </div>
            <div className="admin-actions">
              <button
                className="admin-secondary"
                onClick={() => setAttempt((n) => n + 1)}
              >
                <RefreshCw size={16} />
                Reintentar
              </button>
              <button
                className="admin-secondary"
                onClick={() => logout().catch((e) => setError(explainError(e)))}
              >
                <LogOut size={16} />
                Cerrar sesión
              </button>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
function Login({ initialError }) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(initialError);
  const [cooldown, setCooldown] = useState(0);
  const [setup, setSetup] = useState("checking");
  const [check, setCheck] = useState(0);
  useEffect(() => {
    let live = true;
    setSetup("checking");
    publicSupabase
      .rpc("lch_is_admin")
      .then(({ error: e }) => {
        if (!live) return;
        if (!e) setSetup("ready");
        else if (e.code === "PGRST202") setSetup("pending");
        else {
          setError(explainError(e));
          setSetup("error");
        }
      })
      .catch((e) => {
        if (live) {
          setError(explainError(e));
          setSetup("error");
        }
      });
    return () => {
      live = false;
    };
  }, [check]);
  useEffect(() => {
    if (!cooldown) return;
    const id = setTimeout(() => setCooldown((v) => v - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const { error: err } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: { shouldCreateUser: false, emailRedirectTo: loginRedirect() },
      });
      if (err && ![400, 401, 403, 404, 422].includes(err.status)) throw err;
      setMessage(
        "Si la cuenta está habilitada, recibirás un enlace para entrar. Revisa también el correo no deseado. Puedes abrirlo en Safari o Chrome.",
      );
      setCooldown(60);
    } catch (e) {
      setError(
        e?.status === 429 || /rate limit|too many/i.test(e?.message || "")
          ? "El servicio de correo ha alcanzado su límite de envíos. No se ha enviado otro enlace. Espera antes de volver a solicitarlo."
          : "No se pudo enviar la solicitud. Revisa tu conexión o inténtalo de nuevo más tarde.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      {setup === "pending" && (
        <div className="admin-alert" role="status">
          La configuración del panel necesita revisión. Contacta con quien
          administra el proyecto.
        </div>
      )}
      {setup === "checking" && (
        <p role="status">Comprobando la configuración…</p>
      )}
      {setup === "error" && (
        <button
          className="admin-secondary"
          onClick={() => setCheck((n) => n + 1)}
        >
          Reintentar conexión
        </button>
      )}
      <p>Recibe un enlace de acceso en tu correo. No necesitas contraseña.</p>
      <form onSubmit={submit}>
        <label>
          Correo administrador
          <input
            type="email"
            name="admin-login-email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            inputMode="email"
          />
        </label>
        <button
          className="admin-primary"
          type="submit"
          disabled={busy || cooldown > 0 || setup !== "ready"}
        >
          <Mail size={18} />
          {busy
            ? "Enviando…"
            : cooldown
              ? `Solicitar de nuevo en ${cooldown}s`
              : "Enviar enlace de acceso"}
        </button>
      </form>
      {message && (
        <div className="admin-success" role="status">
          {message}
        </div>
      )}
      {error && (
        <div className="admin-alert" role="alert">
          {error}
        </div>
      )}
      <p className="admin-help">
        El enlace es personal y caduca. No lo compartas.
      </p>
    </>
  );
}
