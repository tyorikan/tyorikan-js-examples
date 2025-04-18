'use server';
/**
 * @fileOverview An AI-powered assistant that analyzes SMS verification code errors and provides suggestions.
 *
 * - smsErrorAssistant - A function that analyzes the SMS verification code and provides suggestions.
 * - SmsErrorAssistantInput - The input type for the smsErrorAssistant function.
 * - SmsErrorAssistantOutput - The return type for the smsErrorAssistant function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

const SmsErrorAssistantInputSchema = z.object({
  verificationCode: z.string().describe('The SMS verification code entered by the user.'),
  phoneNumber: z.string().describe('The phone number the SMS verification code was sent to.'),
  errorDetails: z.string().optional().describe('Optional details about the error encountered during verification.'),
});
export type SmsErrorAssistantInput = z.infer<typeof SmsErrorAssistantInputSchema>;

const SmsErrorAssistantOutputSchema = z.object({
  isValidCode: z.boolean().describe('Whether the verification code is likely valid.'),
  suggestions: z.array(z.string()).describe('Suggestions for the user to try, or reasons why the code might be invalid.'),
});
export type SmsErrorAssistantOutput = z.infer<typeof SmsErrorAssistantOutputSchema>;

export async function smsErrorAssistant(input: SmsErrorAssistantInput): Promise<SmsErrorAssistantOutput> {
  return smsErrorAssistantFlow(input);
}

const smsErrorAssistantPrompt = ai.definePrompt({
  name: 'smsErrorAssistantPrompt',
  input: {
    schema: z.object({
      verificationCode: z.string().describe('The SMS verification code entered by the user.'),
      phoneNumber: z.string().describe('The phone number the SMS verification code was sent to.'),
      errorDetails: z.string().optional().describe('Details about the error encountered during verification, if any.'),
    }),
  },
  output: {
    schema: z.object({
      isValidCode: z.boolean().describe('Whether the verification code is likely valid based on the provided information.'),
      suggestions: z.array(z.string()).describe('Suggestions for the user to try, or reasons why the code might be invalid.'),
    }),
  },
  prompt: `You are an AI assistant that helps users troubleshoot SMS verification code issues.\n\nYou will receive the verification code entered by the user, the phone number it was sent to, and any error details encountered during verification. Your task is to analyze the information and provide suggestions to the user on how to fix the issue.\n\nConsider common errors such as typos, expired codes, incorrect phone numbers, and potential security concerns like phishing attacks.\n\nHere's the information:\nVerification Code: {{{verificationCode}}}\nPhone Number: {{{phoneNumber}}}\nError Details: {{{errorDetails}}}\n\nProvide suggestions to the user, and indicate if the code is likely valid or not.  The suggestions should be helpful and specific to the information provided. The suggestions should be outputted in a numbered list using markdown.\n\nExample output:
{
  "isValidCode": false,
  "suggestions": [
    "1. Double-check the verification code for typos. Even a single incorrect digit will cause the code to fail.",
    "2. Ensure that the phone number you entered is correct, including the country code.",
    "3. Request a new verification code. SMS codes expire quickly, so the code might have expired.",
    "4. Be aware of potential phishing attempts. If you did not request a verification code, someone might be trying to impersonate you.",
   ]
}
`,
});

const smsErrorAssistantFlow = ai.defineFlow<
  typeof SmsErrorAssistantInputSchema,
  typeof SmsErrorAssistantOutputSchema
>({
  name: 'smsErrorAssistantFlow',
  inputSchema: SmsErrorAssistantInputSchema,
  outputSchema: SmsErrorAssistantOutputSchema,
}, async input => {
  const {output} = await smsErrorAssistantPrompt(input);
  return output!;
});
