import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthFrame from "../components/AuthFrame";
import { useAuth } from "../hooks/useAuth";

const RegisterPage = () => {
  const { register, loading } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");

  const onSubmit = async (event) => {
    event.preventDefault();
    setError("");
    try {
      await register(form.name, form.email, form.password);
      navigate("/upload", { replace: true });
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <AuthFrame
      subtitle="Create a workspace for syllabus analysis, paper uploads, and AI backed predictions."
      title="Create account"
      footer={
        <p className="text-sm text-slate-400">
          Already have an account?{" "}
          <Link className="font-semibold text-aqua-300 transition hover:text-mint-300" to="/login">
            Login
          </Link>
        </p>
      }
    >
      <form className="mt-5 space-y-4" onSubmit={onSubmit}>
        <div>
          <label className="field-label">Name</label>
          <input
            className="input"
            onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            required
            type="text"
            value={form.name}
          />
        </div>
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
            minLength={6}
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
          {loading ? "Creating..." : "Register"}
        </button>
      </form>
    </AuthFrame>
  );
};

export default RegisterPage;
