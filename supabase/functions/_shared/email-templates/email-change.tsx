/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface EmailChangeEmailProps {
  siteName: string
  email: string
  newEmail: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({
  siteName,
  email,
  newEmail,
  confirmationUrl,
}: EmailChangeEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Confirm your email change for Scribify</Preview>
    <Body style={main}>
      <Container style={container}>
        <table cellPadding="0" cellSpacing="0" style={{ marginBottom: '32px' }}><tbody><tr>
          <td style={logoBox}><span style={logoLetter}>S</span></td>
          <td style={{ paddingLeft: '10px' }}><span style={logoText}>Scribify</span></td>
        </tr></tbody></table>
        <Heading style={h1}>Confirm your email change</Heading>
        <Text style={text}>
          You requested to change your email address from{' '}
          <Link href={`mailto:${email}`} style={link}>{email}</Link>{' '}
          to{' '}
          <Link href={`mailto:${newEmail}`} style={link}>{newEmail}</Link>.
        </Text>
        <Text style={text}>Click the button below to confirm this change:</Text>
        <Button style={button} href={confirmationUrl}>
          Confirm Email Change
        </Button>
        <Text style={footer}>
          If you didn't request this change, please secure your account immediately.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default EmailChangeEmail

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
const link = { color: '#1a9e8f', textDecoration: 'underline' }
const button = {
  backgroundColor: '#1a9e8f', color: '#ffffff',
  fontSize: '15px', borderRadius: '12px',
  padding: '14px 24px', textDecoration: 'none', fontWeight: '600' as const,
}
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
