import React, { useState } from "react";
import { Field } from "./components.jsx";
import { send } from "./api.js";
export default function Login({ onLogin, toast }) {
  const [register, setRegister] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <main className="login">
      <section className="login-art">
        <div className="brand">
          <span className="brand-mark">▥</span>BuildStock
        </div>
        <h1>
          Build with
          <br />
          clarity.
          <br />
          <em>
            Stock with
            <br />
            confidence.
          </em>
        </h1>
        <p>
          Your materials, projects, and next stock decision. Connected in one
          intelligent workspace.
        </p>
        <div className="blueprint" aria-hidden="true">
          {[70, 100, 130, 175, 155, 110, 140, 85].map((h, i) => (
            <div key={i} style={{ height: h }} />
          ))}
        </div>
      </section>
      <section className="login-form">
        <div className="eyebrow">MATERIAL INTELLIGENCE</div>
        <h2>{register ? "Join your workspace" : "Welcome back"}</h2>
        <p className="subtle">
          {register
            ? "Create an account. Your administrator will assign project access."
            : "Sign in to keep your projects moving."}
        </p>
        <form
          key={String(register)}
          onSubmit={async (e) => {
            e.preventDefault();
            const data = Object.fromEntries(new FormData(e.currentTarget));
            setBusy(true);
            setError("");
            try {
              const result = await send(
                "/auth/" + (register ? "register" : "login"),
                data,
              );
              if (register) {
                setRegister(false);
                toast(result.message);
              } else onLogin(result.user);
            } catch (err) {
              setError(err.message);
            } finally {
              setBusy(false);
            }
          }}
        >
          {register && (
            <Field
              name="name"
              label="Full name"
              required
              maxLength={160}
              autoComplete="name"
            />
          )}
          <Field
            name="email"
            label="Email address"
            type="email"
            required
            autoComplete="username"
          />
          <Field
            name="password"
            label="Password"
            type="password"
            required
            minLength={register ? 10 : undefined}
            maxLength={register ? 72 : undefined}
            autoComplete={register ? "new-password" : "current-password"}
          />
          <div className="form-error" role="alert">
            {error}
          </div>
          <button className="button" type="submit" disabled={busy}>
            {register ? "Create account" : "Sign in"} →
          </button>
        </form>
        <p className="login-switch">
          {register ? "Already have an account?" : "New to BuildStock?"}{" "}
          <button
            className="text-button"
            disabled={busy}
            onClick={() => {
              setRegister(!register);
              setError("");
            }}
          >
            {register ? "Sign in" : "Create account"}
          </button>
        </p>
        <div className="footer-note">BUILDSTOCK · EVERY MATERIAL MATTERS</div>
      </section>
    </main>
  );
}
