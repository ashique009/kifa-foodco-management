import React, { useState, useEffect, useRef, useCallback } from 'react';
import { authApi, healthApi } from '../api';
import { setToken, setStoredUser, ApiError } from '../api/client';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { AlertCircle, RotateCcw, Loader2 } from 'lucide-react';
import logoImg from '../assets/logo.jpg';

interface LoginPageProps {
  onLoginSuccess: (user: { id: string; username: string; role: string }) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Signing In...');
  const [error, setError] = useState<string | null>(null);
  const [isNetworkFailure, setIsNetworkFailure] = useState(false);

  // Background health check status
  const [backendStatus, setBackendStatus] = useState<'idle' | 'checking' | 'ready' | 'waking'>('idle');
  const healthCheckActiveRef = useRef(false);

  // Background wake-up check on mount (non-blocking, single check with gentle fallback)
  const checkBackendHealth = useCallback(async () => {
    if (healthCheckActiveRef.current) return;
    healthCheckActiveRef.current = true;
    setBackendStatus('checking');

    try {
      await healthApi.check();
      setBackendStatus('ready');
    } catch {
      // Backend may be sleeping on free tier
      setBackendStatus('waking');
    } finally {
      healthCheckActiveRef.current = false;
    }
  }, []);

  useEffect(() => {
    checkBackendHealth();
  }, [checkBackendHealth]);

  const executeLogin = async () => {
    if (!username.trim() || !password) {
      setError('Please enter both username and password.');
      return;
    }

    if (isLoading) return; // Prevent duplicate submissions

    setIsLoading(true);
    setError(null);
    setIsNetworkFailure(false);
    setLoadingMessage('Connecting to Kifa FoodCo...');

    const maxLoginAttempts = 3;
    for (let attempt = 1; attempt <= maxLoginAttempts; attempt++) {
      try {
        if (attempt > 1) {
          setLoadingMessage(`Backend is waking up (attempt ${attempt} of ${maxLoginAttempts})...`);
        }

        const response = await authApi.login({ username, password });
        setToken(response.token);
        setStoredUser(response.user);
        onLoginSuccess(response.user);
        return;
      } catch (err: any) {
        // If it is NOT a network error (e.g. 401 Invalid credentials, 403 inactive), DO NOT RETRY!
        const isNet = err instanceof ApiError ? err.isNetworkError : err?.status === 0;
        if (!isNet) {
          setError(err.message || 'Invalid username or password.');
          setIsNetworkFailure(false);
          setIsLoading(false);
          return;
        }

        // It is a network / cold-start error
        if (attempt < maxLoginAttempts) {
          setLoadingMessage(`Backend is waking up. Please wait (${attempt}/${maxLoginAttempts})...`);
          await new Promise((r) => setTimeout(r, 3500));
        } else {
          // All bounded attempts exhausted
          setError(
            'Backend is taking longer than usual to wake up. Free-tier servers take around a minute on first connect. Please try again in a moment.'
          );
          setIsNetworkFailure(true);
          setIsLoading(false);
          return;
        }
      }
    }

    setIsLoading(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeLogin();
  };

  const handleRetry = () => {
    setError(null);
    setIsNetworkFailure(false);
    executeLogin();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Brand Header */}
        <div className="text-center">
          <img
            src={logoImg}
            alt="Kifa Food Co."
            className="w-20 h-20 mx-auto rounded-2xl shadow-md object-contain mb-3"
          />
          <h1 className="text-2xl sm:text-3xl font-bold font-brand tracking-tight text-slate-900">
            Kifa Food Co.
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Wholesale & Distribution Management System
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <Card className="p-6 sm:p-8 shadow-sm border border-slate-200">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              Sign In to Operations
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Enter your manager or dispatch crew credentials.
            </p>
          </div>

          {/* Backend Waking State Notice (if detected sleeping before submit) */}
          {backendStatus === 'waking' && !isLoading && !error && (
            <div className="mb-5 p-3 rounded-lg bg-amber-50 border border-amber-200/80 flex items-center gap-2.5 text-xs text-amber-800">
              <Loader2 className="w-4 h-4 animate-spin shrink-0 text-amber-600" />
              <div className="flex-1">
                <span className="font-semibold">Backend is waking up:</span> Free-tier server can take up to a minute on first visit. You can enter your credentials now.
              </div>
            </div>
          )}

          {/* In-Flight Connection Notice during submit */}
          {isLoading && (
            <div className="mb-5 p-3 rounded-lg bg-blue-50 border border-blue-200/80 flex items-center gap-2.5 text-xs text-blue-800">
              <Loader2 className="w-4 h-4 animate-spin shrink-0 text-blue-600" />
              <div className="flex-1 font-medium">{loadingMessage}</div>
            </div>
          )}

          {/* Error Message with optional Retry action */}
          {error && (
            <div className="mb-5 p-3 rounded-lg bg-rose-50 border border-rose-200/80 flex flex-col gap-2.5 text-xs text-rose-700">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
                <div className="flex-1 font-medium leading-relaxed">{error}</div>
              </div>
              {isNetworkFailure && (
                <div className="pl-6 pt-1">
                  <button
                    type="button"
                    onClick={handleRetry}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-rose-300 hover:bg-rose-50 rounded-md font-semibold text-rose-700 shadow-sm transition-colors text-xs"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Try Again
                  </button>
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Input
                label="Username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username (e.g. admin)"
                required
                autoFocus
                disabled={isLoading}
              />
            </div>

            <div>
              <Input
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                disabled={isLoading}
              />
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full justify-center"
                disabled={isLoading}
                leftIcon={isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : undefined}
              >
                {isLoading ? loadingMessage : 'Sign In'}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};

