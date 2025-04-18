import { auth } from '@lib/firebase-admin';
import { NextResponse } from 'next/server';

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const { uid, phoneNumber } = await request.json();

    const formattedPhoneNumber = phoneNumber.startsWith('+')
      ? phoneNumber
      : phoneNumber.startsWith('0')
        ? `+81${phoneNumber.substring(1)}`
        : `+81${phoneNumber}`;

    await auth.updateUser(uid, {
      phoneNumber: formattedPhoneNumber,
      multiFactor: {
        enrolledFactors: [{
          uid: uid,
          factorId: 'phone',
          displayName: 'Phone',
          phoneNumber: formattedPhoneNumber
        }]
      }
    });

    return NextResponse.json({
      success: true
    }, { status: 200 });
  } catch (error: any) {
    console.error('Error enrolling MFA:', error);
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

