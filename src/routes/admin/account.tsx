import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2, KeyRound, Mail } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/lib/supabase";
import { useRequireAdmin } from "@/hooks/use-admin";

export const Route = createFileRoute("/admin/account")({
  head: () => ({ meta: [{ title: "Account | Diamond House Admin" }] }),
  component: AccountPage,
});

function AccountPage() {
  const { session } = useRequireAdmin();

  const [email, setEmail] = useState("");
  const [savingEmail, setSavingEmail] = useState(false);
  const [emailMsg, setEmailMsg] = useState<string | null>(null);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<string | null>(null);

  const inputCls =
    "mt-1 w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/40";

  const changeEmail = async () => {
    setEmailMsg(null);
    if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email.trim())) {
      setEmailMsg("योग्य ईमेल टाका.");
      return;
    }
    setSavingEmail(true);
    try {
      const { error } = await supabase.auth.updateUser({ email: email.trim() });
      if (error) throw error;
      setEmailMsg("तपासणी ईमेल पाठवली आहे — नवीन ईमेलमधील लिंकवर क्लिक करून पुष्टी करा. ✅");
      setEmail("");
    } catch (e) {
      setEmailMsg(e instanceof Error ? e.message : "अपडेट अयशस्वी.");
    } finally {
      setSavingEmail(false);
    }
  };

  const changePassword = async () => {
    setPasswordMsg(null);
    if (password.length < 8) {
      setPasswordMsg("पासवर्ड किमान 8 अक्षरांचा असावा.");
      return;
    }
    if (password !== confirmPassword) {
      setPasswordMsg("दोन्ही पासवर्ड जुळत नाहीत.");
      return;
    }
    setSavingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setPasswordMsg("पासवर्ड यशस्वीरित्या बदलला! ✅");
      setPassword("");
      setConfirmPassword("");
    } catch (e) {
      setPasswordMsg(e instanceof Error ? e.message : "अपडेट अयशस्वी.");
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <AdminLayout title="अकाउंट सेटिंग्ज">
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="surface-card p-6" data-testid="account-current">
          <h2 className="deva text-lg text-foreground">सध्याचा लॉगिन</h2>
          <p className="mt-2 text-sm text-muted-foreground">{session?.user.email}</p>
        </div>

        <div />

        {/* Change email */}
        <div className="surface-card p-6" data-testid="change-email-form">
          <h2 className="deva flex items-center gap-2 text-lg text-foreground">
            <Mail className="h-5 w-5 text-accent" /> ईमेल बदला
          </h2>
          <p className="deva mt-1 text-xs text-muted-foreground">
            नवीन ईमेलवर पडताळणी लिंक पाठवली जाईल. लिंकवर क्लिक केल्यावरच बदल पूर्ण होईल.
          </p>
          <div className="mt-5">
            <label className="text-sm text-foreground">नवीन ईमेल</label>
            <input
              type="email"
              className={inputCls}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="new-admin@example.com"
              data-testid="new-email"
            />
          </div>
          {emailMsg && (
            <p className="deva mt-4 text-sm text-[var(--whatsapp)]" data-testid="email-msg">
              {emailMsg}
            </p>
          )}
          <button
            onClick={changeEmail}
            disabled={savingEmail}
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-navy px-6 py-2.5 text-sm font-semibold text-gold-light disabled:opacity-70"
            data-testid="save-email"
          >
            {savingEmail ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Mail className="h-4 w-4" />
            )}
            ईमेल अपडेट करा
          </button>
        </div>

        {/* Change password */}
        <div className="surface-card p-6" data-testid="change-password-form">
          <h2 className="deva flex items-center gap-2 text-lg text-foreground">
            <KeyRound className="h-5 w-5 text-accent" /> पासवर्ड बदला
          </h2>
          <p className="deva mt-1 text-xs text-muted-foreground">
            किमान 8 अक्षरांचा मजबूत पासवर्ड वापरा (अक्षरे + आकडे + चिन्ह).
          </p>
          <div className="mt-5 space-y-4">
            <div>
              <label className="text-sm text-foreground">नवीन पासवर्ड</label>
              <input
                type="password"
                className={inputCls}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                data-testid="new-password"
                autoComplete="new-password"
              />
            </div>
            <div>
              <label className="text-sm text-foreground">पासवर्ड पुन्हा टाका</label>
              <input
                type="password"
                className={inputCls}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                data-testid="confirm-password"
                autoComplete="new-password"
              />
            </div>
          </div>
          {passwordMsg && (
            <p className="deva mt-4 text-sm text-[var(--whatsapp)]" data-testid="password-msg">
              {passwordMsg}
            </p>
          )}
          <button
            onClick={changePassword}
            disabled={savingPassword}
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-navy px-6 py-2.5 text-sm font-semibold text-gold-light disabled:opacity-70"
            data-testid="save-password"
          >
            {savingPassword ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <KeyRound className="h-4 w-4" />
            )}
            पासवर्ड अपडेट करा
          </button>
        </div>
      </div>
    </AdminLayout>
  );
}
