/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your Scribify verification code</Preview>
    <Body style={main}>
      <Container style={container}>
        <table cellPadding="0" cellSpacing="0" style={{ marginBottom: '32px' }}><tbody><tr>
          <td style={logoBox}><span style={logoLetter}>S</span></td>
          <td style={{ paddingLeft: '10px' }}><span style={logoText}>Scribify</span></td>
        </tr></tbody></table>
        <Heading style={h1}>Confirm your identity</Heading>
        <Text style={text}>Use the code below to verify it's you:</Text>
        <Text style={codeStyle}>{token}</Text>
        <Text style={footer}>
          This code will expire shortly. If you didn't request this, you can
          safely ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Plus Jakarta Sans', 'Inter', Arial, sans-serif" }
const container = { padding: '40px 25px' }
const logoBox = {
  width: '36px', height: '36px', borderRadius: '10px',
  backgroundColor: '#1a9e8f', textAlign: 'center' as const,
  verticalAlign: 'middle' as const,
}
const logoLetter = { color: '#ffffff', fontWeight: 'bold' as const, fontSize: '18px' }
const logoText = { fontWeight: 'bold' as const, fontSize: '20px', color: '#141b2d' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: '#141b2d', margin: '0 0 20px' }
const text = { fontSize: '15px', color: '#6b7280', lineHeight: '1.6', margin: '0 0 25px' }
const codeStyle = {
  fontFamily: 'Courier, monospace',
  fontSize: '28px', fontWeight: 'bold' as const,
  color: '#1a9e8f', margin: '0 0 30px', letterSpacing: '4px',
}
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
