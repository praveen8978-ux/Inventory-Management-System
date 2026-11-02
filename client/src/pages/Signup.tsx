import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { parseApiError } from "../api/client";
import AuthShell from "../components/AuthShell";
import Field from "../components/Field";
import { useAuth } from "../context/AuthContext";

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [orgName, setOrgName] = useState("");
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError("");
    setFieldErrors({});

    const errs: Record<string, string> = {};
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) errs.email = "Enter a valid email address";
    if (password.length < 8) errs.password = "Password must be at least 8 characters";
    if (confirm !== password) errs.confirmPassword = "Passwords don't match";
    if (orgName.trim().length < 2) errs.organizationName = "Organization name must be at least 2 characters";
    if (Object.keys(errs).length) return setFieldErrors(errs);

    setSubmitting(true);
    try {
      await signup(email, password, orgName);
      navigate("/", { replace: true });
    } catch (err) {
      const e2 = parseApiError(err);
      setFormError(e2.message);
      setFieldErrors(e2.fieldErrors);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell title="Create your account" subtitle="Set up your organization and start tracking stock.">
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {formError && (
          <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">
            {formError}
          </p>
        )}
        <Field label="Organization name" name="organizationName" placeholder="My Test Store" value={orgName}
          onChange={(e) => setOrgName(e.target.value)} error={fieldErrors.organizationName} />
        <Field label="Email" name="email" type="email" autoComplete="email" value={email}
          onChange={(e) => setEmail(e.target.value)} error={fieldErrors.email} />
        <Field label="Password" name="password" type="password" autoComplete="new-password" value={password}
          onChange={(e) => setPassword(e.target.value)} error={fieldErrors.password} />
        <Field label="Confirm password" name="confirmPassword" type="password" autoComplete="new-password" value={confirm}
          onChange={(e) => setConfirm(e.target.value)} error={fieldErrors.confirmPassword} />
        <button type="submit" disabled={submitting}
          className="w-full rounded-md bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2">
          {submitting ? "Creating account..." : "Create account"}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-stone-600">
        Already have an account?{" "}
        <Link to="/login" className="font-medium text-teal-700 hover:underline">Log in</Link>
      </p>
    </AuthShell>
  );
}