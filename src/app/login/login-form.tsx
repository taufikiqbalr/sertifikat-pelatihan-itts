"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useFormStatus } from "react-dom";
import { loginAction } from "./actions";
import LoginIcon from "./login-icon";
import styles from "./login.module.css";

// This child reads the parent Server Action form's pending state.
function LoginFields({ hasError }: { hasError: boolean }) {
  const { pending } = useFormStatus();
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (hasError) errorRef.current?.focus();
  }, [hasError]);

  useEffect(() => {
    if (pending) setShowPassword(false);
  }, [pending]);

  function checkCapsLock(event: KeyboardEvent<HTMLInputElement>) {
    setCapsLock(event.getModifierState("CapsLock"));
  }

  return (
    <div className={styles.fields} aria-busy={pending}>
      {hasError ? (
        <div ref={errorRef} id="login-error" role="alert" tabIndex={-1} className={styles.errorAlert}>
          <LoginIcon name="alert" />
          <div><strong>Belum berhasil masuk</strong><p>Email atau password tidak sesuai. Periksa kembali, lalu coba lagi.</p></div>
        </div>
      ) : null}

      <div className={styles.field}>
        <label htmlFor="login-email">Email admin</label>
        <div className={styles.inputWrap}>
          <LoginIcon name="mail" />
          <input id="login-email" name="email" type="email" placeholder="nama@itts.ac.id" autoComplete="username" inputMode="email" autoCapitalize="none" spellCheck={false} required readOnly={pending} aria-invalid={hasError || undefined} aria-describedby={hasError ? "login-error" : undefined} />
        </div>
      </div>

      <div className={styles.field}>
        <label htmlFor="login-password">Password</label>
        <div className={styles.inputWrap}>
          <LoginIcon name="lock" />
          <input id="login-password" name="password" type={showPassword ? "text" : "password"} placeholder="Masukkan password Anda" autoComplete="current-password" autoCapitalize="none" spellCheck={false} required readOnly={pending} onKeyDown={checkCapsLock} onKeyUp={checkCapsLock} onBlur={() => setCapsLock(false)} aria-invalid={hasError || undefined} aria-describedby={hasError ? "login-error login-caps-lock" : "login-caps-lock"} />
          <button className={styles.passwordToggle} type="button" aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"} aria-pressed={showPassword} aria-controls="login-password" disabled={pending} onClick={() => setShowPassword((visible) => !visible)}>
            <LoginIcon name={showPassword ? "eyeOff" : "eye"} />
          </button>
        </div>
        <div id="login-caps-lock" className={styles.capsLock} role="status" aria-live="polite">{capsLock ? "Caps Lock aktif. Periksa huruf besar pada password." : ""}</div>
      </div>

      <button className={styles.submitButton} type="submit" disabled={pending}>
        {pending ? <span className={styles.spinner} aria-hidden="true" /> : null}
        <span>{pending ? "Memeriksa akun..." : "Masuk ke dashboard"}</span>
        {!pending ? <LoginIcon name="arrow" /> : null}
      </button>
      <span className={styles.srOnly} role="status" aria-live="polite">{pending ? "Sedang memeriksa akun. Mohon tunggu." : ""}</span>
    </div>
  );
}

export default function LoginForm({ hasError }: { hasError: boolean }) {
  return <form action={loginAction} className={styles.form}><LoginFields hasError={hasError} /></form>;
}
