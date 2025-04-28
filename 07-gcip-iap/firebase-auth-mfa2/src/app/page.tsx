'use client'

import React, { useEffect, useState } from 'react'
import { initializeApp } from 'firebase/app'
import {
  Auth,
  UserCredential,
  RecaptchaVerifier,
  getAuth,
  signInWithEmailAndPassword,
  multiFactor,
  PhoneAuthProvider,
  PhoneMultiFactorGenerator,
  getMultiFactorResolver,
  PhoneMultiFactorSignInInfoOptions,
} from 'firebase/auth'
import { AuthenticationHandler } from 'gcip-iap'

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
}

const app = initializeApp(config)
const auth = getAuth(app)

type SignInParams = {
  email: string
  password: string
}

type RegisterMFAParams = {
  phoneNumber: string
}

type VerifyMFAParams = {
  otp: string
}

class Authentication implements AuthenticationHandler {

  private onStartSignIn: () => Promise<SignInParams>
  private onRegisterMFA: () => Promise<RegisterMFAParams>
  private onStartMFA: () => Promise<VerifyMFAParams>

  constructor(props: {
    onStartSignIn: () => Promise<SignInParams>,
    onRegisterMFA: () => Promise<RegisterMFAParams>,
    onStartMFA: () => Promise<VerifyMFAParams>
  }) {
    this.onStartSignIn = props.onStartSignIn
    this.onRegisterMFA = props.onRegisterMFA
    this.onStartMFA = props.onStartMFA
  }

  getAuth(apiKey: string, tenantId: string | null) {
    return auth
  }

  startSignIn(auth: Auth): Promise<UserCredential> {
    return new Promise(async (resolve) => {
      const { email, password } = await this.onStartSignIn()
      try {
        const cred = await signInWithEmailAndPassword(auth, email, password)
        resolve(cred)
      } catch (error: any) {
        if (error.code == 'auth/multi-factor-auth-required') {
          console.log('mfa required')
          const resolver = getMultiFactorResolver(auth, error)
          const phoneAuth = new PhoneAuthProvider(auth)
          const verifier = new RecaptchaVerifier('recapctha-container', { 'size': 'invisible' }, auth)
          const verifyOptions: PhoneMultiFactorSignInInfoOptions = {
            multiFactorHint: resolver.hints[0],
            session: resolver.session
          }
          const verificationId = await phoneAuth.verifyPhoneNumber(verifyOptions, verifier)
          const { otp } = await this.onStartMFA()
          const phoneAuthCred = PhoneAuthProvider.credential(verificationId, otp)
          const multiFactorAssertion = PhoneMultiFactorGenerator.assertion(phoneAuthCred)
          const cred = await resolver.resolveSignIn(multiFactorAssertion)
          resolve(cred)
        }
      }
    })
  }

  completeSignOut() {
    return Promise.resolve()
  }

}

let signInHandler: (params: SignInParams) => void
let registerMFAHandler: (params: RegisterMFAParams) => void
let verifyMFAHandler: (params: VerifyMFAParams) => void

const App = () => {

  const [state, setState] = useState('SIGN_IN')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [otp, setOtp] = useState('')

  const [error, setError] = useState('')

  const signInPromise = () => {
    return new Promise((resolve: (params: SignInParams) => void) => {
      signInHandler = resolve
    })
  }
  const registerMFAPromise = () => {
    return new Promise((resolve: (params: RegisterMFAParams) => void) => {
      registerMFAHandler = resolve
    })
  }
  const verifyMFAPromise = () => {
    return new Promise((resolve: (params: VerifyMFAParams) => void) => {
      verifyMFAHandler = resolve
    })
  }

  const onStartSignIn = async () => {
    console.log('start sign in')
    setState('SIGN_IN')
    return await signInPromise()
  }

  const onRegisterMFA = async () => {
    console.log('start sregister mfa')
    setState('REGISTER_MFA')
    return await registerMFAPromise()
  }

  const onStartMFA = async () => {
    console.log('start mfa')
    setState('VERIFY_MFA')
    return await verifyMFAPromise()
  }

  const onSignInSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    console.log('on signin submit')
    signInHandler({ email, password })
  }

  const onPhoneNumberSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    console.log('on register mfa submit')
    registerMFAHandler({ phoneNumber })
  }

  const onMFASubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    console.log('on verify mfa submit')
    verifyMFAHandler({ otp })
  }

  useEffect(() => {
    const authentication = new Authentication({
      onStartSignIn, onRegisterMFA, onStartMFA
    })
    authentication.startSignIn(auth).then(creds => {
      console.log(`signed in : ${creds}`)
    })
    import('gcip-iap').then(ciap => {
      const ciapInstance = new ciap.Authentication(authentication)
      ciapInstance.start()
    })
  }, [])

  return <div id="form-container">
    {
      state == 'SIGN_IN' && (
        <form onSubmit={onSignInSubmit}>
          <div>
            <label htmlFor="email">メールアドレス:</label>
            <input
            type="text"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            />
          </div>
          <div>
            <label htmlFor="password">パスワード:</label>
            <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            />
          </div>
          <button type="submit">ログイン</button>
        </form>
      )
    }
    {
      state == 'REGISTER_MFA' && (
        <form onSubmit={onPhoneNumberSubmit}>
          <div>
            <label htmlFor="phonenumber">電話番号:</label>
            <input
            type="text"
            id="phonenumber"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            required
            />
          </div>
          <button type="submit">送信</button>
        </form>
      )
    }
    {
      state == 'VERIFY_MFA' && (
        <form onSubmit={onMFASubmit}>
          <div>
            <label htmlFor="otp">OTP:</label>
            <input
            type="text"
            id="otp"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            required
            />
          </div>
          <button type="submit">送信</button>
        </form>
      )
    }
    <div id="recapctha-container"></div>
  </div>
}

export default App