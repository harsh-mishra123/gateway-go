"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function HomePage() {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.replace("/dashboard");
    }
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded) {
    return (
      <div className="auth-page-container">
        <div className="auth-bg-grid" />
        <div className="auth-bg-glow auth-bg-glow--1" />
        <div className="auth-bg-glow auth-bg-glow--2" />
      </div>
    );
  }

  if (isSignedIn) {
    return null;
  }

  return (
    <div className="login-container">
      {/* Background visual elements */}
      <div className="login-bg-grid" />
      <div className="login-bg-glow login-bg-glow--1" />
      <div className="login-bg-glow login-bg-glow--2" />

      {/* Theme toggle in corner */}
      <div className="login-theme-toggle">
        <ThemeToggle />
      </div>

      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">gateway-go</div>
          <p className="login-subtitle">
            Monitor and control your API gateway in real-time
          </p>
        </div>

        <div className="login-cta-group">
          <Link href="/sign-in" className="login-submit">
            Sign In
          </Link>
          <Link href="/sign-up" className="login-submit login-submit--secondary">
            Create Account
          </Link>
        </div>

      </div>
    </div>
  );
}
