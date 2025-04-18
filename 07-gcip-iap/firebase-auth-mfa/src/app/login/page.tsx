'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  RecaptchaVerifier,
  signInWithEmailAndPassword,
  PhoneAuthProvider,
  multiFactor,
  PhoneMultiFactorGenerator,
  MultiFactorResolver
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, CheckCircle, LogIn } from 'lucide-react';

// reCAPTCHAの型定義
declare global {
  interface Window {
    recaptchaVerifier: any;
  }
}

export default function MFALogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [loginStep, setLoginStep] = useState<'email' | 'verification' | 'success'>('email');
  const [verificationId, setVerificationId] = useState('');
  const [multiFactorResolver, setMultiFactorResolver] = useState<MultiFactorResolver | null>(null);
  const router = useRouter();
  const { toast } = useToast();
  const recaptchaContainerRef = useRef<HTMLDivElement>(null);

  // reCAPTCHAの初期化
  useEffect(() => {
    if (typeof window !== 'undefined' && recaptchaContainerRef.current && !window.recaptchaVerifier) {
      try {
        window.recaptchaVerifier = new RecaptchaVerifier(
          auth,
          recaptchaContainerRef.current,
          {
            'size': 'invisible',
            'callback': (response: string) => {
              console.log("reCAPTCHA verified", response);
            },
            'expired-callback': () => {
              console.log("reCAPTCHA expired");
              if (window.recaptchaVerifier) {
                window.recaptchaVerifier.clear();
                window.recaptchaVerifier = null;
                initializeRecaptcha();
              }
            }
          }
        );
      } catch (err) {
        console.error("Error initializing reCAPTCHA", err);
      }
    }
  }, []);

  // reCAPTCHA初期化関数
  const initializeRecaptcha = () => {
    if (typeof window !== 'undefined' && recaptchaContainerRef.current && !window.recaptchaVerifier) {
      try {
        window.recaptchaVerifier = new RecaptchaVerifier(
          auth,
          recaptchaContainerRef.current,
          {
            'size': 'invisible',
            'callback': () => {},
            'expired-callback': () => {}
          }
        );
      } catch (err) {
        console.error("Error re-initializing reCAPTCHA", err);
      }
    }
  };

  // メール/パスワードでのログイン処理
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage('');

    try {
      await signInWithEmailAndPassword(auth, email, password);
      
      // ここでMFA確認が必要な場合は自動的に例外が発生し、catch句で処理される
      // MFA不要の場合は成功画面へ
      setIsLoading(false);
      setIsSuccess(true);
      setLoginStep('success');
      toast({
        title: 'ログイン成功',
        description: 'MFAなしでログインしました',
      });
    } catch (error: any) {
      console.log('Sign-in error:', error);
      console.log('Error type:', typeof error);
      console.log('Error properties:', Object.keys(error));

      // customDataがあれば、その中身も確認
      if (error.customData) {
        console.log('customData properties:', Object.keys(error.customData));
      }

      // MFA認証が必要なエラーの場合
      if (error.code === 'auth/multi-factor-auth-required') {
        // resolverの取得を試みる
        let resolver = null;
        
        // 可能性のあるすべてのパスを試す
        if (error.resolver) {
          resolver = error.resolver;
        } else if (error.customData && error.customData.resolver) {
          resolver = error.customData.resolver;
        } else if (error._multiFactorResolver) {
          resolver = error._multiFactorResolver;
        }
        if (!resolver) {
          console.error('Could not find MFA resolver in error object');
          setErrorMessage('MFA認証エラー: resolverが見つかりません');
          setIsLoading(false);
          return;
        }
          
        setMultiFactorResolver(resolver);
        
        // ユーザーがセットアップした多要素認証の方法を確認
        const hints = resolver.hints;
        
        // 電話番号を使用した多要素認証の場合
        if (hints[0].factorId === PhoneMultiFactorGenerator.FACTOR_ID) {
          try {
            // セッション情報を取得
            const session = resolver.session;
            
            // 電話認証プロバイダを作成
            const phoneAuthProvider = new PhoneAuthProvider(auth);
            
            // 電話番号認証を開始（SMSを送信）
            const phoneInfoOptions = {
              multiFactorHint: resolver.hints[0],
              session
            };
            
            // SMS送信
            const verificationId = await phoneAuthProvider.verifyPhoneNumber(
              phoneInfoOptions, 
              window.recaptchaVerifier
            );
            
            setVerificationId(verificationId);
            setLoginStep('verification');
            toast({
              title: '確認コード送信',
              description: '登録された電話番号に確認コードを送信しました',
            });
          } catch (smsError: any) {
            console.error('SMS送信エラー:', smsError);
            setErrorMessage(`確認コード送信エラー: ${smsError.message}`);
            
            // reCAPTCHAをリセット
            if (window.recaptchaVerifier) {
              window.recaptchaVerifier.clear();
              window.recaptchaVerifier = null;
              initializeRecaptcha();
            }
          }
        }
      } else {
        // その他のログインエラー
        setErrorMessage(error.message || 'ログインに失敗しました');
      }
      
      setIsLoading(false);
    }
  };

  // 確認コードの検証
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage('');

    try {
      if (!multiFactorResolver || !verificationId) {
        throw new Error('セッション情報が不正です');
      }

      // 電話番号確認コードからクレデンシャル作成
      const cred = PhoneAuthProvider.credential(verificationId, verificationCode);
      
      // MultiFactorAssertion作成
      const assertion = PhoneMultiFactorGenerator.assertion(cred);
      
      // 最終的な認証実行
      await multiFactorResolver.resolveSignIn(assertion);
      
      setIsSuccess(true);
      setLoginStep('success');
      toast({
        title: 'MFA認証成功',
        description: '多要素認証によるログインに成功しました',
      });
    } catch (error: any) {
      console.error('確認コード検証エラー:', error);
      setErrorMessage(error.message || '確認コードの検証に失敗しました');
      
      // コードが間違っていた場合
      if (error.code === 'auth/invalid-verification-code') {
        setErrorMessage('確認コードが正しくありません。再度お試しください。');
      }
      
      // セッションが期限切れの場合
      if (error.code === 'auth/session-expired') {
        setErrorMessage('セッションの期限が切れました。再度ログインしてください。');
        setLoginStep('email');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ログアウト処理
  const handleLogout = async () => {
    try {
      await auth.signOut();
      setLoginStep('email');
      setIsSuccess(false);
      setEmail('');
      setPassword('');
      setVerificationCode('');
      setErrorMessage('');
      toast({
        title: 'ログアウト',
        description: 'ログアウトしました',
      });
    } catch (error: any) {
      console.error('ログアウトエラー:', error);
      toast({
        title: 'エラー',
        description: 'ログアウトに失敗しました',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-slate-50">
      <div ref={recaptchaContainerRef} id="recaptcha-container"></div>
      
      <div className="w-full max-w-md">
        {/* エラーメッセージ */}
        {errorMessage && (
          <Alert variant="destructive" className="mb-4">
            <AlertTitle>エラー</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        {/* ステップ1: メール/パスワードログイン */}
        {loginStep === 'email' && (
          <Card>
            <CardHeader>
              <CardTitle>ログイン</CardTitle>
              <CardDescription>メールアドレスとパスワードを入力してください</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleEmailLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">メールアドレス</Label>
                  <Input 
                    id="email"
                    type="email"
                    placeholder="example@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">パスワード</Label>
                  <Input 
                    id="password"
                    type="password"
                    placeholder="********"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
                      処理中...
                    </>
                  ) : (
                    <>
                      <LogIn className="mr-2 h-4 w-4" />
                      ログイン
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* ステップ2: 確認コード入力 */}
        {loginStep === 'verification' && (
          <Card>
            <CardHeader>
              <CardTitle>多要素認証</CardTitle>
              <CardDescription>SMSで送信された確認コードを入力してください</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleVerifyCode} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="code">確認コード</Label>
                  <Input 
                    id="code"
                    type="text"
                    placeholder="123456"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    required
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
                      検証中...
                    </>
                  ) : (
                    '確認する'
                  )}
                </Button>
                <Button 
                  type="button" 
                  variant="outline"
                  className="w-full"
                  onClick={() => setLoginStep('email')}
                >
                  戻る
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* ステップ3: ログイン成功 */}
        {loginStep === 'success' && (
          <Card>
            <CardHeader className="text-center">
              <CheckCircle className="mx-auto h-16 w-16 text-green-500" />
              <CardTitle className="mt-4">ログイン成功</CardTitle>
              <CardDescription>多要素認証によるログインが完了しました</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Alert className="bg-green-50">
                  <AlertTitle>認証済み</AlertTitle>
                  <AlertDescription>
                    {auth.currentUser?.email || 'ユーザー'} としてログインしています
                  </AlertDescription>
                </Alert>
                <Button 
                  className="w-full" 
                  onClick={handleLogout}
                >
                  ログアウト
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}