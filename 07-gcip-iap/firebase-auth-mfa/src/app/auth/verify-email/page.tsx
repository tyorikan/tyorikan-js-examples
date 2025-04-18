'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { auth } from '@lib/firebase'
import { applyActionCode } from 'firebase/auth';

// 実際の検証ロジックを含むコンポーネント
function VerifyEmailContent() {
  const [verificationStatus, setVerificationStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        // const oobCode = searchParams.get('oobCode');
        // if (!oobCode) {
        //   throw new Error('No verification code provided');
        // }

        // await applyActionCode(auth, oobCode);
        
        setVerificationStatus('success');
        // 3秒後にダッシュボードにリダイレクト
        setTimeout(() => {
          router.push('/');
        }, 3000);
      } catch (error) {
        console.error('Email verification error:', error);
        setVerificationStatus('error');
      }
    };

    verifyEmail();
  }, [searchParams, router]);

  return (
    <div className="w-full max-w-md space-y-4 rounded-lg bg-white p-6 shadow-lg">
      {verificationStatus === 'verifying' && (
        <div className="text-center">
          <h1 className="text-2xl font-bold">メールアドレスを確認中...</h1>
          <p className="mt-2 text-gray-600">少々お待ちください</p>
        </div>
      )}
      
      {verificationStatus === 'success' && (
        <div className="text-center">
          <h1 className="text-2xl font-bold text-green-600">メールアドレスの確認が完了しました</h1>
          <p className="mt-2 text-gray-600">ダッシュボードにリダイレクトします...</p>
        </div>
      )}
      
      {verificationStatus === 'error' && (
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">エラーが発生しました</h1>
          <p className="mt-2 text-gray-600">メールアドレスの確認に失敗しました</p>
          <button
            onClick={() => router.push('/')}
            className="mt-4 rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
          >
            ホームに戻る
          </button>
        </div>
      )}
    </div>
  );
}

// ローディング中に表示するフォールバックUI
function VerifyEmailFallback() {
  return (
    <div className="w-full max-w-md space-y-4 rounded-lg bg-white p-6 shadow-lg">
      <div className="text-center">
        <h1 className="text-2xl font-bold">読み込み中...</h1>
        <p className="mt-2 text-gray-600">少々お待ちください</p>
      </div>
    </div>
  );
}

// メインコンポーネント
export default function VerifyEmail() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <Suspense fallback={<VerifyEmailFallback />}>
        <VerifyEmailContent />
      </Suspense>
    </div>
  );
}