import { Link } from 'react-router-dom';
import { ArrowLeft, KeyRound, ShieldCheck } from 'lucide-react';

export function AdminForgotPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(ellipse_at_75%_8%,#d9f5e9_0%,transparent_38%),linear-gradient(145deg,#f9fcff_0%,#f1faf6_54%,#fff_100%)] px-4 py-10">
      <section className="w-full max-w-xl rounded-[28px] border border-white bg-white/95 p-7 shadow-[0_24px_80px_-32px_rgba(17,66,51,0.28)] sm:p-10">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800"><KeyRound className="h-7 w-7" aria-hidden="true" /></div>
        <div className="mt-5 text-center">
          <h1 className="text-3xl font-extrabold tracking-tight text-[#101a3b]">Admin Password Help</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
            Admin sign-in uses credentials configured on the server. Password recovery by email or OTP is not enabled for this environment-managed account.
          </p>
        </div>
        <div className="mt-6 flex gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/80 p-4 text-sm leading-6 text-emerald-950">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" aria-hidden="true" />
          <p>Contact your LocalFix system administrator to update the server-side <code className="rounded bg-white/80 px-1.5 py-0.5 font-semibold">ADMIN_PASSWORD</code>. No password or verification code will be sent from this page.</p>
        </div>
        <Link to="/admin/login" className="mt-7 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-emerald-700 px-5 font-bold text-white transition hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-200">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to Admin Login
        </Link>
      </section>
    </main>
  );
}

export default AdminForgotPasswordPage;
