import React, { useState } from "react";
import { WiDaySunny } from "react-icons/wi";
import { IoMailOutline, IoLockClosedOutline, IoLogInOutline } from "react-icons/io5";
import { useAuth } from "../contexts/AuthContext";
import toast from "react-hot-toast";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Masukkan email dan password!");
      return;
    }
    setIsLoading(true);
    try {
      await login(email, password);
      toast.success("Login berhasil!");
    } catch (err) {
      console.error("Login error:", err);
      let msg = "Login gagal!";
      if (err.code === "auth/user-not-found") msg = "Akun tidak ditemukan.";
      else if (err.code === "auth/wrong-password") msg = "Password salah.";
      else if (err.code === "auth/invalid-email") msg = "Format email tidak valid.";
      else if (err.code === "auth/invalid-credential") msg = "Email atau password salah.";
      else if (err.code === "auth/too-many-requests") msg = "Terlalu banyak percobaan. Coba lagi nanti.";
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-bg-orbs">
        <div className="login-orb orb-1" />
        <div className="login-orb orb-2" />
        <div className="login-orb orb-3" />
      </div>

      <div className="login-card">
        <div className="login-brand">
          <div className="login-logo-circle">
            <WiDaySunny size={48} />
          </div>
          <h1 className="login-title">Solar Dryer IoT</h1>
          <p className="login-subtitle">Masuk ke dashboard monitoring</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="login-field">
            <label className="login-label" htmlFor="login-email">Email</label>
            <div className="login-input-wrap">
              <IoMailOutline className="login-input-icon" />
              <input
                id="login-email"
                type="email"
                className="login-input"
                placeholder="nama@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                autoComplete="email"
              />
            </div>
          </div>

          <div className="login-field">
            <label className="login-label" htmlFor="login-password">Password</label>
            <div className="login-input-wrap">
              <IoLockClosedOutline className="login-input-icon" />
              <input
                id="login-password"
                type="password"
                className="login-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                autoComplete="current-password"
              />
            </div>
          </div>

          <button
            type="submit"
            className={`login-submit ${isLoading ? "loading" : ""}`}
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="login-spinner" />
            ) : (
              <>
                <IoLogInOutline size={20} />
                <span>Masuk</span>
              </>
            )}
          </button>
        </form>

        <div className="login-footer">
          <p>Solar Dryer IoT Monitoring System</p>
        </div>
      </div>
    </div>
  );
}
