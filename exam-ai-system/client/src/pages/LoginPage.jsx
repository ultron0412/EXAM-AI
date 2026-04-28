import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import AuthFrame from "../components/AuthFrame";
import { useAuth } from "../hooks/useAuth";

const LoginPage = () => {
  const { login, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");

  const onSubmit = async (event) => {
    event.preventDefault();
    setError("");
    try {
      await login(form.email, form.password);
      const redirectTo = location.state?.from || "/upload";
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <AuthFrame
      subtitle="Access uploaded papers, prediction scores, mock tests, and focused study plans."
      title="Welcome back"
      footer={
        <p className="text-sm text-slate-400">
          No account?{" "}
          <Link className="font-semibold text-aqua-300 transition hover:text-mint-300" to="/register">
            Register
          </Link>
        </p>
      }
    >
      <form className="mt-5 space-y-4" onSubmit={onSubmit}>
        <div>
          <label className="field-label">Email</label>
          <input
            className="input"
            onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
            required
            type="email"
            value={form.email}
          />
        </div>
        <div>
          <label className="field-label">Password</label>
          <input
            className="input"
            onChange={(event) =>
              setForm((prev) => ({ ...prev, password: event.target.value }))
            }
            required
            type="password"
            value={form.password}
          />
        </div>
        {error ? <p className="status-error">{error}</p> : null}
        <button className="btn-primary w-full" disabled={loading} type="submit">
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>
    </AuthFrame>
  );
};

export default LoginPage;
