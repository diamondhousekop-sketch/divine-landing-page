import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, KeyRound, Mail, UserPlus, Trash2, Users } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/lib/supabase";
import { useRequireAdmin } from "@/hooks/use-admin";
import { adminFetch } from "@/lib/admin-api";

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

  // ── Manage other admins ──
  type AdminUser = { id: string; email: string; created_at: string };
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [selfId, setSelfId] = useState<string | null>(null);
  const [loadingAdmins, setLoadingAdmins] = useState(true);
  const [adminsErr, setAdminsErr] = useState<string | null>(null);

  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [addingAdmin, setAddingAdmin] = useState(false);
  const [addMsg, setAddMsg] = useState<string | null>(null);

  const [resetId, setResetId] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [resetBusy, setResetBusy] = useState(false);
  const [resetMsg, setResetMsg] = useState<string | null>(null);

  const loadAdmins = async () => {
    setLoadingAdmins(true);
    setAdminsErr(null);
    try {
      const d = await adminFetch<{ users: AdminUser[]; self_id: string }>("/api/admin/users");
      setAdmins(d.users);
      setSelfId(d.self_id);
    } catch (e) {
      setAdminsErr(e instanceof Error ? e.message : "यादी मिळाली नाही.");
    } finally {
      setLoadingAdmins(false);
    }
  };

  useEffect(() => {
    loadAdmins();
  }, []);

  const addAdmin = async () => {
    setAddMsg(null);
    if (!newEmail.trim() || !/^\S+@\S+\.\S+$/.test(newEmail.trim())) {
      setAddMsg("योग्य ईमेल टाका.");
      return;
    }
    if (newPassword.length < 8) {
      setAddMsg("पासवर्ड किमान 8 अक्षरांचा असावा.");
      return;
    }
    setAddingAdmin(true);
    try {
      await adminFetch("/api/admin/users", {
        method: "POST",
        body: { email: newEmail.trim(), password: newPassword },
      });
      setAddMsg("नवीन अ‍ॅडमिन तयार झाला — तो/ती लगेच लॉगिन करू शकतात. ✅");
      setNewEmail("");
      setNewPassword("");
      loadAdmins();
    } catch (e) {
      setAddMsg(e instanceof Error ? e.message : "तयार करता आले नाही.");
    } finally {
      setAddingAdmin(false);
    }
  };

  const resetAdminPassword = async () => {
    if (!resetId) return;
    setResetMsg(null);
    if (resetPassword.length < 8) {
      setResetMsg("पासवर्ड किमान 8 अक्षरांचा असावा.");
      return;
    }
    setResetBusy(true);
    try {
      await adminFetch("/api/admin/users", {
        method: "PATCH",
        body: { id: resetId, password: resetPassword },
      });
      setResetMsg("पासवर्ड बदलला! ✅");
      setResetPassword("");
      setTimeout(() => {
        setResetId(null);
        setResetMsg(null);
      }, 1200);
    } catch (e) {
      setResetMsg(e instanceof Error ? e.message : "अपडेट करता आले नाही.");
    } finally {
      setResetBusy(false);
    }
  };

  const deleteAdmin = async (a: AdminUser) => {
    if (!confirm(`${a.email} ला अ‍ॅडमिन यादीतून काढायचे?`)) return;
    try {
      await adminFetch(`/api/admin/users?id=${a.id}`, { method: "DELETE" });
      setAdmins((prev) => prev.filter((x) => x.id !== a.id));
    } catch (e) {
      alert(e instanceof Error ? e.message : "Delete failed");
    }
  };

  const changeEmail = async () => {
    setEmailMsg(null);
    if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email.trim())) {
      setEmailMsg("योग्य ईमेल टाका.");
      return;
    }
    setSavingEmail(true);
    try {
      const { error } = await supabase.auth.updateUser(
        { email: email.trim() },
        { emailRedirectTo: `${window.location.origin}/admin/account` },
      );
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

      {/* ── Manage admins ── */}
      <div className="surface-card mt-6 p-6" data-testid="manage-admins">
        <h2 className="deva flex items-center gap-2 text-lg text-foreground">
          <Users className="h-5 w-5 text-accent" /> अ‍ॅडमिन व्यवस्थापन
        </h2>
        <p className="deva mt-1 text-xs text-muted-foreground">
          नवीन अ‍ॅडमिन इथून लगेच तयार होतो (ईमेल कन्फर्मेशनची वाट पाहावी लागत नाही), आणि कोणत्याही
          अ‍ॅडमिनचा पासवर्ड इथून रीसेट करता येतो.
        </p>

        {/* Add new admin */}
        <div className="mt-5 grid gap-3 rounded-xl border border-border bg-card/50 p-4 sm:grid-cols-3">
          <input
            type="email"
            className={inputCls}
            placeholder="नवीन अ‍ॅडमिन ईमेल"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            data-testid="new-admin-email"
          />
          <input
            type="password"
            className={inputCls}
            placeholder="पासवर्ड (किमान 8 अक्षरे)"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            data-testid="new-admin-password"
            autoComplete="new-password"
          />
          <button
            onClick={addAdmin}
            disabled={addingAdmin}
            className="deva inline-flex items-center justify-center gap-2 rounded-full bg-navy px-5 py-2.5 text-sm font-semibold text-gold-light disabled:opacity-70"
            data-testid="add-admin"
          >
            {addingAdmin ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <UserPlus className="h-4 w-4" />
            )}
            अ‍ॅडमिन तयार करा
          </button>
        </div>
        {addMsg && (
          <p className="deva mt-2 text-sm text-[var(--whatsapp)]" data-testid="add-admin-msg">
            {addMsg}
          </p>
        )}

        {/* Existing admins list */}
        <div className="mt-6 space-y-2">
          {loadingAdmins ? (
            <p className="deva flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> यादी लोड होत आहे...
            </p>
          ) : adminsErr ? (
            <p className="text-sm text-destructive">{adminsErr}</p>
          ) : (
            admins.map((a) => (
              <div
                key={a.id}
                className="flex flex-col gap-2 rounded-xl border border-border p-3 sm:flex-row sm:items-center sm:justify-between"
                data-testid={`admin-row-${a.email}`}
              >
                <div>
                  <p className="text-sm text-foreground">
                    {a.email}
                    {a.id === selfId && (
                      <span className="deva ml-2 rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
                        तुम्ही
                      </span>
                    )}
                  </p>
                </div>
                {resetId === a.id ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="password"
                      className="w-40 rounded-lg border border-border bg-card px-3 py-1.5 text-xs outline-none"
                      placeholder="नवीन पासवर्ड"
                      value={resetPassword}
                      onChange={(e) => setResetPassword(e.target.value)}
                      autoComplete="new-password"
                      data-testid={`reset-password-input-${a.email}`}
                    />
                    <button
                      onClick={resetAdminPassword}
                      disabled={resetBusy}
                      className="deva rounded-full bg-navy px-4 py-1.5 text-xs font-semibold text-gold-light disabled:opacity-70"
                    >
                      {resetBusy ? "..." : "जतन करा"}
                    </button>
                    <button
                      onClick={() => {
                        setResetId(null);
                        setResetPassword("");
                        setResetMsg(null);
                      }}
                      className="deva text-xs text-muted-foreground hover:underline"
                    >
                      रद्द करा
                    </button>
                    {resetMsg && (
                      <span className="deva text-xs text-[var(--whatsapp)]">{resetMsg}</span>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setResetId(a.id);
                        setResetPassword("");
                        setResetMsg(null);
                      }}
                      className="deva inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs hover:bg-secondary"
                      data-testid={`reset-password-${a.email}`}
                    >
                      <KeyRound className="h-3.5 w-3.5" /> पासवर्ड रीसेट
                    </button>
                    {a.id !== selfId && (
                      <button
                        onClick={() => deleteAdmin(a)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-destructive/50 text-destructive hover:bg-destructive/10"
                        title="अ‍ॅडमिन काढा"
                        data-testid={`delete-admin-${a.email}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
