'use client';

import { useState, useEffect, useRef } from 'react';
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signInWithEmailAndPassword,
  PhoneAuthProvider,
  User,
  sendEmailVerification,
  updatePhoneNumber,
  signInWithCredential,
  PhoneMultiFactorGenerator,
  PhoneAuthCredential,
  UserCredential,
  MultiFactorUser,
  multiFactor,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { smsErrorAssistant } from '@/ai/flows/sms-error-assistant';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

// reCAPTCHAの型定義を追加
declare global {
  interface Window {
    recaptchaVerifier: any;
  }
}

// User型の拡張
interface ExtendedUser extends User {
  multiFactor?: {
    enrolledFactors?: Array<{
      uid: string;
      factorId: string;
      displayName?: string;
      enrollmentTime: string;
      phoneNumber?: string;
    }>;
  };
}

const containerStyle = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  minHeight: '100vh',
  backgroundColor: 'hsl(var(--secondary))',
};

const cardStyle = {
  width: '400px',
  padding: '20px',
  borderRadius: '8px',
  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
};

const inputStyle = {
  width: '100%',
  padding: '10px',
  margin: '8px 0',
  borderRadius: '4px',
  border: '1px solid #ddd',
};

const buttonStyle = {
  width: '100%',
  padding: '10px',
  margin: '8px 0',
  borderRadius: '4px',
  backgroundColor: 'hsl(var(--primary))',
  color: 'hsl(var(--primary-foreground))',
  border: 'none',
  cursor: 'pointer',
};

const errorStyle = {
  color: 'red',
  marginTop: '5px',
};

// スタイル定義
const statusCardStyle = {
  ...cardStyle,
  backgroundColor: 'hsl(var(--background))',
  marginBottom: '20px',
};

const statusItemStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  marginBottom: '10px',
  padding: '8px',
  backgroundColor: 'hsl(var(--muted))',
  borderRadius: '4px',
};

// JSON表示用のスタイル
const jsonStyle = {
  whiteSpace: 'pre-wrap', // 改行を保持
  overflowWrap: 'break-word' as 'break-word', // 長い単語を折り返す
  fontFamily: 'monospace', // 等幅フォント
  fontSize: '12px',
  backgroundColor: 'hsl(var(--muted))',
  padding: '10px',
  borderRadius: '4px',
  overflow: 'auto', // 必要に応じてスクロールバーを表示
};

export default function Home() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<any>(null);
  const [errorDetails, setErrorDetails] = useState('');
  const {toast} = useToast();
  const [isCodeValid, setIsCodeValid] = useState(true);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [currentUser, setCurrentUser] = useState<ExtendedUser | null>(null);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [mfaPending, setMfaPending] = useState(false);

  // reCAPTCHAの初期化
  useEffect(() => {
    if (typeof window !== 'undefined' && !currentUser) {
      const recaptchaContainer = document.getElementById('recaptcha-container');
      if (recaptchaContainer) {
        try {
          window.recaptchaVerifier = new RecaptchaVerifier(
            auth,
            recaptchaContainer,
            {
              'size': 'invisible',
              'callback': (response: string) => {
                console.log("reCAPTCHA verified", response);
              },
              'expired-callback': () => {
                toast({ title: 'reCAPTCHA Expired', description: 'Please try again.' });
              }
            }
          );
        } catch (err) {
          console.error("Error initializing reCAPTCHA", err);
          toast({ title: 'reCAPTCHA Error', description: 'Failed to initialize reCAPTCHA.', variant: 'destructive' });
        }
      }
    }
  }, [toast, currentUser]);

  const formatPhoneNumber = (number: string) => {
    // 数字以外の文字を削除
    const digitsOnly = number.replace(/\D/g, '');
    
    // 日本の電話番号の場合
    if (digitsOnly.startsWith('0')) {
      return `+81${digitsOnly.substring(1)}`;
    }
    
    // すでに国際形式の場合
    if (digitsOnly.startsWith('81')) {
      return `+${digitsOnly}`;
    }
    
    // その他の場合はそのまま返す
    return `+${digitsOnly}`;
  };

  // メール/パスワードでのログイン
  const handleEmailPasswordSignIn = async () => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      setCurrentUser(user);
      setIsEmailVerified(user.emailVerified);
      setErrorMessage('');

      // メール認証が必要な場合
      if (!user.emailVerified) {
        const actionCodeSettings = {
          url: `${process.env.NEXT_PUBLIC_APP_URL}/auth/verify-email`,
        };
        await sendEmailVerification(user, actionCodeSettings);
        toast({
          title: 'Verification email sent!',
          description: 'Please check your email and verify your address.',
        });
        return;
      }

      toast({ title: 'Sign-in successful!', description: `Welcome ${email}.` });
    } catch (error: any) {
      console.error('Email sign-in error:', error);
      setErrorMessage(error.message);
      toast({ title: 'Sign-in Error', description: error.message, variant: 'destructive' });
    }
  };

  // 電話番号の検証コード送信
  const sendVerificationCode = async () => {
    try {
      if (!currentUser) {
        throw new Error('Please sign in first');
      }

      const formattedPhoneNumber = formatPhoneNumber(phoneNumber);

      if (!window.recaptchaVerifier) {
        throw new Error('reCAPTCHA not ready');
      }

      // トークンを強制的に更新
      await currentUser.getIdToken(true);

      // multiFactor取得
      const multiFactorUser = multiFactor(currentUser);

      // セッション取得 - ここが重要
      const multiFactorSession = await multiFactorUser.getSession();
    
      // 電話番号の検証
      const phoneProvider = new PhoneAuthProvider(auth);
      const verificationId = await phoneProvider.verifyPhoneNumber(
        {
          multiFactorUid: currentUser.uid,
          phoneNumber: formattedPhoneNumber,
          session: multiFactorSession,
        },
        window.recaptchaVerifier
      );

      setConfirmationResult({ verificationId });
      setMfaPending(true);

      toast({
        title: 'Verification code sent!',
        description: `Check your phone (${formattedPhoneNumber}) for the verification code.`,
      });
    } catch (error: any) {
      console.error('Error sending verification code:', error);
      console.log('Error code:', error.code);
      console.log('Error details:', error.message);
      setErrorDetails(error.toString());
      
      let errorMessage = error.message || 'Failed to send verification code.';
  
      // if (error.code === 'auth/invalid-app-credential') {
      //   errorMessage = 'reCAPTCHA検証に失敗しました。ページを更新して再試行してください。';
        
      //   // reCAPTCHAをリセット
      //   if (window.recaptchaVerifier) {
      //     try {
      //       window.recaptchaVerifier.clear();
      //       window.recaptchaVerifier = null;
      //       // 再初期化
      //       // ...
      //     } catch (e) {
      //       console.error('Failed to reset reCAPTCHA', e);
      //     }
      //   }
      // }

      if (error.code === 'auth/invalid-phone-number') {
        errorMessage = 'Invalid phone number format. Please enter a valid phone number.';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many attempts. Please try again later.';
      } else if (error.code === 'auth/admin-restricted-operation') {
        errorMessage = 'Phone authentication is restricted. Please check App Check or API key settings in the Firebase Console.';
        // reCAPTCHAをリセット
        if (window.recaptchaVerifier) {
          window.recaptchaVerifier.clear();
          window.recaptchaVerifier = null;
        }
      }

      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  // 検証コードの確認と電話番号の登録
  const handleVerifyCode = async () => {
    try {
      if (!confirmationResult || !currentUser) {
        throw new Error('No confirmation result or user available');
      }

      // 検証コードの確認
      const credential = PhoneAuthProvider.credential(
        confirmationResult.verificationId,
        verificationCode
      );

      // 電話番号をユーザーに紐づけ
      await updatePhoneNumber(currentUser, credential);

      // MFAの設定を更新
      const response = await fetch('/api/enrollMFA', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uid: currentUser.uid,
          phoneNumber: phoneNumber
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to enroll MFA');
      }

      // ユーザー情報を更新
      setCurrentUser(await auth.currentUser as ExtendedUser);

      toast({
        title: 'Success',
        description: 'Phone number verified and enrolled as MFA successfully',
      });

      setVerificationCode('');
      setMfaPending(false);
    } catch (error: any) {
      console.error('Error verifying code:', error);
      let errorMessage = error.message || 'Failed to verify code';
      if (error.code === 'auth/invalid-verification-code') {
        errorMessage = 'Invalid verification code. Please check and try again.';
      } else if (error.code === 'auth/invalid-app-credential') {
        errorMessage = 'Invalid verification. Please try sending the code again.';
        // reCAPTCHAをリセット
        if (window.recaptchaVerifier) {
          window.recaptchaVerifier.clear();
          window.recaptchaVerifier = null;
        }
      }

      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  // UIコンポーネント
  const emailPasswordCard = (
    <Card style={cardStyle}>
      <CardHeader>
        <CardTitle>Email / Password Sign In</CardTitle>
        <CardDescription>Sign in with your email and password.</CardDescription>
      </CardHeader>
      <CardContent>
        <Label htmlFor="email">Email</Label>
        <Input
          style={inputStyle}
          type="email"
          id="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Label htmlFor="password">Password</Label>
        <Input
          style={inputStyle}
          type="password"
          id="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Button style={buttonStyle} onClick={handleEmailPasswordSignIn}>
          Sign In with Email
        </Button>
        {errorMessage && <div style={errorStyle}>{errorMessage}</div>}
      </CardContent>
    </Card>
  );

  const phoneVerificationCard = (
    <Card style={cardStyle}>
      <CardHeader>
        <CardTitle>Phone Number Verification</CardTitle>
        <CardDescription>Enter your phone number to enable MFA.</CardDescription>
      </CardHeader>
      <CardContent>
        <Label htmlFor="phoneNumber">Phone Number</Label>
        <Input
          style={inputStyle}
          type="tel"
          id="phoneNumber"
          placeholder="Phone Number"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
        />
        <Button style={buttonStyle} onClick={sendVerificationCode}>
          Send Verification Code
        </Button>
      </CardContent>
    </Card>
  );

  const verificationCodeCard = (
    <Card style={cardStyle}>
      <CardHeader>
        <CardTitle>Verification Code</CardTitle>
        <CardDescription>Enter the verification code sent to your phone.</CardDescription>
      </CardHeader>
      <CardContent>
        <Label htmlFor="verificationCode">Verification Code</Label>
        <Input
          style={inputStyle}
          type="text"
          id="verificationCode"
          placeholder="Verification Code"
          value={verificationCode}
          onChange={(e) => setVerificationCode(e.target.value)}
        />
        <Button style={buttonStyle} onClick={handleVerifyCode}>
          Verify Code
        </Button>
      </CardContent>
    </Card>
  );

  // ステータス情報を表示するコンポーネント
  const StatusCard = () => (
    <Card style={statusCardStyle}>
      <CardHeader>
        <CardTitle>Current Status</CardTitle>
      </CardHeader>
      <CardContent>
        <div style={statusItemStyle}>
          <span>Logged In:</span>
          <span>{currentUser ? 'Yes' : 'No'}</span>
        </div>
        {currentUser && (
          <>
            <div style={statusItemStyle}>
              <span>Email:</span>
              <span>{currentUser.email}</span>
            </div>
            <div style={statusItemStyle}>
              <span>Email Verified:</span>
              <span>{isEmailVerified ? 'Yes' : 'No'}</span>
            </div>
            <div style={statusItemStyle}>
              <span>Phone Number:</span>
              <span>{currentUser.phoneNumber || 'Not set'}</span>
            </div>
            <div style={statusItemStyle}>
              <span>MFA Status:</span>
              <span>
                {currentUser.multiFactor?.enrolledFactors && 
                 currentUser.multiFactor.enrolledFactors.length > 0 
                  ? 'Enabled' 
                  : 'Disabled'}
              </span>
            </div>
            {currentUser.multiFactor?.enrolledFactors && 
             currentUser.multiFactor.enrolledFactors.length > 0 && (
              <div style={statusItemStyle}>
                <span>MFA Factors:</span>
                <span>
                  {currentUser.multiFactor.enrolledFactors
                    .map(factor => factor.displayName || factor.factorId)
                    .join(', ')}
                </span>
              </div>
            )}
            {/* JSON形式でcurrentUserを表示 */}
            <div style={statusItemStyle}>
              <span>Current User (JSON):</span>
              <pre style={jsonStyle}>
                {JSON.stringify(currentUser, null, 2)}
              </pre>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div style={containerStyle}>
      <div id="recaptcha-container"></div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <StatusCard />
        {!currentUser && emailPasswordCard}
        {currentUser && !isEmailVerified && (
          <Card style={cardStyle}>
            <CardHeader>
              <CardTitle>Email Verification Required</CardTitle>
              <CardDescription>Please verify your email address to continue.</CardDescription>
            </CardHeader>
          </Card>
        )}
        {currentUser && isEmailVerified && !mfaPending && phoneVerificationCard}
        {mfaPending && verificationCodeCard}
      </div>
    </div>
  );
}
