/**
 * SalesOS Email Templates
 *
 * Design Philosophy: Clean, Modern, Professional
 * Inspired by: Apple, Stripe, Linear communications
 *
 * Principles:
 * - Clean typography with generous whitespace
 * - Warm beige backgrounds with gold accents
 * - Dark CTAs for high contrast and action
 * - Professional yet approachable tone
 */

// ==================== SALESOS BRAND SYSTEM ====================

export const SALESOS_BRAND = {
  colors: {
    // Primary palette
    gold: '#EAD07D',
    goldLight: '#EAD07D20',
    goldMedium: '#EAD07D40',
    dark: '#1A1A1A',
    darkHover: '#333333',

    // Backgrounds
    background: '#F2F1EA',
    backgroundAlt: '#F8F8F6',
    surface: '#FFFFFF',
    surfaceHover: '#F8F8F6',
    lightSurface: '#F0EBD8',

    // Typography
    textDark: '#1A1A1A',
    textMedium: '#666666',
    textMuted: '#999999',
    textLight: '#BBBBBB',

    // Utility
    border: '#E5E5E5',
    borderLight: '#F0EBD8',
    success: '#93C01F',
    successLight: '#93C01F20',
    warning: '#EAD07D',
    warningLight: '#EAD07D30',
    error: '#DC2626',
    errorLight: '#FEE2E2',
    info: '#3B82F6',
    infoLight: '#DBEAFE',
  },
  fonts: {
    heading: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
    body: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  },
  logo: {
    text: 'SalesOS',
    tagline: 'AI-Powered Sales Intelligence',
  },
};

// SalesOS Logo - Dark rounded square with command icon
export const SALESOS_LOGO = `
<table role="presentation" cellspacing="0" cellpadding="0" border="0">
  <tr>
    <td style="width: 40px; height: 40px; background-color: ${SALESOS_BRAND.colors.dark}; border-radius: 10px; text-align: center; vertical-align: middle;">
      <span style="font-size: 18px; color: #ffffff; line-height: 40px;">&#8984;</span>
    </td>
    <td style="padding-left: 12px;">
      <span style="font-family: ${SALESOS_BRAND.fonts.heading}; font-size: 20px; font-weight: 700; color: ${SALESOS_BRAND.colors.dark}; letter-spacing: -0.5px;">SalesOS</span>
    </td>
  </tr>
</table>`;

// ==================== CORE TEMPLATE ====================

export type SalesOSButtonStyle = 'primary' | 'secondary' | 'gold' | 'outline' | 'ghost';

/**
 * Generate a SalesOS-branded email template
 */
export function generateSalesOSTemplate(options: {
  preheader?: string;
  content: string;
  footerText?: string;
  ctaButton?: { text: string; url: string; style?: SalesOSButtonStyle };
  showLogo?: boolean;
}): string {
  const {
    preheader = '',
    content,
    footerText,
    ctaButton,
    showLogo = true,
  } = options;

  const getButtonStyles = (style: SalesOSButtonStyle = 'primary') => {
    switch (style) {
      case 'gold':
        return `background-color: ${SALESOS_BRAND.colors.gold}; color: ${SALESOS_BRAND.colors.dark};`;
      case 'secondary':
        return `background-color: ${SALESOS_BRAND.colors.backgroundAlt}; color: ${SALESOS_BRAND.colors.dark}; border: 1px solid ${SALESOS_BRAND.colors.border};`;
      case 'outline':
        return `background-color: transparent; color: ${SALESOS_BRAND.colors.dark}; border: 2px solid ${SALESOS_BRAND.colors.dark};`;
      case 'ghost':
        return `background-color: transparent; color: ${SALESOS_BRAND.colors.dark};`;
      case 'primary':
      default:
        return `background-color: ${SALESOS_BRAND.colors.dark}; color: #ffffff;`;
    }
  };

  const ctaHtml = ctaButton ? `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 32px 0 0 0;">
      <tr>
        <td align="center">
          <a href="${ctaButton.url}" target="_blank" style="display: inline-block; ${getButtonStyles(ctaButton.style)} font-family: ${SALESOS_BRAND.fonts.body}; font-size: 14px; font-weight: 600; text-decoration: none; padding: 14px 36px; border-radius: 50px; letter-spacing: 0.3px;">
            ${ctaButton.text}
          </a>
        </td>
      </tr>
    </table>` : '';

  const logoHtml = showLogo ? `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
      <tr>
        <td align="center" style="padding: 32px 0 24px 0;">
          ${SALESOS_LOGO}
        </td>
      </tr>
    </table>` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <title>SalesOS</title>
  ${preheader ? `<div style="display:none;font-size:1px;color:${SALESOS_BRAND.colors.background};line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">${preheader}</div>` : ''}
  <style>
    @media only screen and (max-width: 600px) {
      .email-container { width: 100% !important; margin: 0 !important; }
      .content-cell { padding: 32px 24px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: ${SALESOS_BRAND.colors.background}; font-family: ${SALESOS_BRAND.fonts.body}; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;">

  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: ${SALESOS_BRAND.colors.background};">
    <tr>
      <td align="center" style="padding: 48px 20px;">

        <!-- Email Card -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="520" class="email-container" style="background-color: ${SALESOS_BRAND.colors.surface}; border-radius: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); border: 1px solid rgba(0,0,0,0.05);">

          <!-- Logo -->
          <tr>
            <td>
              ${logoHtml}
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td class="content-cell" style="padding: 0 48px 48px 48px;">
              ${content}
              ${ctaHtml}
            </td>
          </tr>

        </table>

        <!-- Footer -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="520" class="email-container">
          <tr>
            <td align="center" style="padding: 32px 20px;">
              <p style="margin: 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 12px; color: ${SALESOS_BRAND.colors.textMuted}; line-height: 1.6;">
                ${footerText || `&copy; ${new Date().getFullYear()} SalesOS. All rights reserved.`}
              </p>
              <p style="margin: 8px 0 0 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 12px; color: ${SALESOS_BRAND.colors.textLight};">
                AI-Powered Sales Intelligence Platform
              </p>
            </td>
          </tr>
        </table>

      </td>
    </tr>
  </table>

</body>
</html>`;
}

// ==================== HELPER FUNCTIONS ====================

function formatGreeting(name?: string): string {
  if (name) {
    const firstName = name.split(' ')[0];
    return `Hi ${firstName},`;
  }
  return 'Hi there,';
}

function formatCodeBox(code: string): string {
  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 24px 0;">
      <tr>
        <td align="center">
          <div style="background-color: ${SALESOS_BRAND.colors.lightSurface}; border-radius: 16px; padding: 24px 32px; display: inline-block;">
            <span style="font-family: 'SF Mono', 'Roboto Mono', monospace; font-size: 32px; font-weight: 700; letter-spacing: 8px; color: ${SALESOS_BRAND.colors.dark};">${code}</span>
          </div>
        </td>
      </tr>
    </table>`;
}

function formatInfoBox(title: string, items: { label: string; value: string }[]): string {
  const itemsHtml = items.map(item => `
    <tr>
      <td style="padding: 8px 0; border-bottom: 1px solid ${SALESOS_BRAND.colors.borderLight};">
        <span style="font-family: ${SALESOS_BRAND.fonts.body}; font-size: 13px; color: ${SALESOS_BRAND.colors.textMuted};">${item.label}</span>
      </td>
      <td style="padding: 8px 0; border-bottom: 1px solid ${SALESOS_BRAND.colors.borderLight}; text-align: right;">
        <span style="font-family: ${SALESOS_BRAND.fonts.body}; font-size: 13px; font-weight: 500; color: ${SALESOS_BRAND.colors.textDark};">${item.value}</span>
      </td>
    </tr>
  `).join('');

  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 24px 0; background-color: ${SALESOS_BRAND.colors.backgroundAlt}; border-radius: 16px; padding: 20px;">
      <tr>
        <td colspan="2" style="padding: 0 0 12px 0;">
          <span style="font-family: ${SALESOS_BRAND.fonts.body}; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: ${SALESOS_BRAND.colors.textMuted};">${title}</span>
        </td>
      </tr>
      ${itemsHtml}
    </table>`;
}

function formatDivider(): string {
  return `<hr style="border: none; border-top: 1px solid ${SALESOS_BRAND.colors.borderLight}; margin: 24px 0;">`;
}

function formatSecurityNote(text: string): string {
  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 24px 0;">
      <tr>
        <td style="background-color: ${SALESOS_BRAND.colors.goldLight}; border-radius: 12px; padding: 16px 20px; border-left: 4px solid ${SALESOS_BRAND.colors.gold};">
          <p style="margin: 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 13px; color: ${SALESOS_BRAND.colors.textMedium}; line-height: 1.6;">
            ${text}
          </p>
        </td>
      </tr>
    </table>`;
}

// ==================== EMAIL TEMPLATES ====================

/**
 * Welcome Email - Sent after user registration
 */
export function generateSalesOSWelcomeEmail(params: {
  userName?: string;
  userEmail: string;
  loginUrl: string;
}): string {
  const { userName, userEmail, loginUrl } = params;

  const content = `
    <h1 style="margin: 0 0 8px 0; font-family: ${SALESOS_BRAND.fonts.heading}; font-size: 28px; font-weight: 600; color: ${SALESOS_BRAND.colors.textDark}; line-height: 1.3;">
      Welcome to SalesOS
    </h1>
    <p style="margin: 0 0 24px 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 15px; color: ${SALESOS_BRAND.colors.textMuted}; line-height: 1.6;">
      Your AI-powered sales journey starts now
    </p>

    ${formatDivider()}

    <p style="margin: 0 0 16px 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 15px; color: ${SALESOS_BRAND.colors.textMedium}; line-height: 1.7;">
      ${formatGreeting(userName)}
    </p>
    <p style="margin: 0 0 16px 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 15px; color: ${SALESOS_BRAND.colors.textMedium}; line-height: 1.7;">
      Welcome aboard! Your SalesOS account has been created and you're ready to transform how you sell.
    </p>
    <p style="margin: 0 0 24px 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 15px; color: ${SALESOS_BRAND.colors.textMedium}; line-height: 1.7;">
      Here's what you can do with SalesOS:
    </p>

    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0 0 24px 0;">
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid ${SALESOS_BRAND.colors.borderLight};">
          <span style="font-family: ${SALESOS_BRAND.fonts.body}; font-size: 14px; color: ${SALESOS_BRAND.colors.textDark}; font-weight: 500;">Manage leads & contacts</span>
          <span style="font-family: ${SALESOS_BRAND.fonts.body}; font-size: 13px; color: ${SALESOS_BRAND.colors.textMuted}; display: block; margin-top: 4px;">Track and nurture your sales pipeline</span>
        </td>
      </tr>
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid ${SALESOS_BRAND.colors.borderLight};">
          <span style="font-family: ${SALESOS_BRAND.fonts.body}; font-size: 14px; color: ${SALESOS_BRAND.colors.textDark}; font-weight: 500;">AI-powered insights</span>
          <span style="font-family: ${SALESOS_BRAND.fonts.body}; font-size: 13px; color: ${SALESOS_BRAND.colors.textMuted}; display: block; margin-top: 4px;">Get intelligent recommendations and scoring</span>
        </td>
      </tr>
      <tr>
        <td style="padding: 12px 0;">
          <span style="font-family: ${SALESOS_BRAND.fonts.body}; font-size: 14px; color: ${SALESOS_BRAND.colors.textDark}; font-weight: 500;">Close more deals</span>
          <span style="font-family: ${SALESOS_BRAND.fonts.body}; font-size: 13px; color: ${SALESOS_BRAND.colors.textMuted}; display: block; margin-top: 4px;">Streamline your entire sales process</span>
        </td>
      </tr>
    </table>

    <p style="margin: 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 15px; color: ${SALESOS_BRAND.colors.textMedium}; line-height: 1.7;">
      Ready to get started? Click below to access your dashboard.
    </p>
  `;

  return generateSalesOSTemplate({
    preheader: 'Welcome to SalesOS - Your AI-powered sales journey starts now',
    content,
    ctaButton: {
      text: 'Go to Dashboard',
      url: loginUrl,
      style: 'primary',
    },
  });
}

/**
 * Forgot Password Email - Sent when user requests password reset
 */
export function generateSalesOSForgotPasswordEmail(params: {
  userName?: string;
  resetCode: string;
  resetUrl: string;
  expirationMinutes?: number;
}): string {
  const { userName, resetCode, resetUrl, expirationMinutes = 30 } = params;

  const content = `
    <h1 style="margin: 0 0 8px 0; font-family: ${SALESOS_BRAND.fonts.heading}; font-size: 28px; font-weight: 600; color: ${SALESOS_BRAND.colors.textDark}; line-height: 1.3;">
      Reset Your Password
    </h1>
    <p style="margin: 0 0 24px 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 15px; color: ${SALESOS_BRAND.colors.textMuted}; line-height: 1.6;">
      Use the code below to reset your password
    </p>

    ${formatDivider()}

    <p style="margin: 0 0 16px 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 15px; color: ${SALESOS_BRAND.colors.textMedium}; line-height: 1.7;">
      ${formatGreeting(userName)}
    </p>
    <p style="margin: 0 0 24px 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 15px; color: ${SALESOS_BRAND.colors.textMedium}; line-height: 1.7;">
      We received a request to reset your password. Use the verification code below to proceed:
    </p>

    ${formatCodeBox(resetCode)}

    <p style="margin: 0 0 8px 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 13px; color: ${SALESOS_BRAND.colors.textMuted}; text-align: center;">
      This code expires in <strong>${expirationMinutes} minutes</strong>
    </p>

    ${formatSecurityNote("If you didn't request this password reset, you can safely ignore this email. Your password will remain unchanged.")}

    <p style="margin: 24px 0 0 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 15px; color: ${SALESOS_BRAND.colors.textMedium}; line-height: 1.7;">
      Or click the button below to reset your password directly:
    </p>
  `;

  return generateSalesOSTemplate({
    preheader: `Your SalesOS password reset code is ${resetCode}`,
    content,
    ctaButton: {
      text: 'Reset Password',
      url: resetUrl,
      style: 'primary',
    },
  });
}

/**
 * Password Reset Confirmation - Sent after successful password change
 */
export function generateSalesOSPasswordResetEmail(params: {
  userName?: string;
  loginUrl: string;
  resetTime?: string;
}): string {
  const { userName, loginUrl, resetTime } = params;
  const formattedTime = resetTime || new Date().toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  });

  const content = `
    <h1 style="margin: 0 0 8px 0; font-family: ${SALESOS_BRAND.fonts.heading}; font-size: 28px; font-weight: 600; color: ${SALESOS_BRAND.colors.textDark}; line-height: 1.3;">
      Password Updated
    </h1>
    <p style="margin: 0 0 24px 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 15px; color: ${SALESOS_BRAND.colors.textMuted}; line-height: 1.6;">
      Your password has been successfully changed
    </p>

    ${formatDivider()}

    <p style="margin: 0 0 16px 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 15px; color: ${SALESOS_BRAND.colors.textMedium}; line-height: 1.7;">
      ${formatGreeting(userName)}
    </p>
    <p style="margin: 0 0 24px 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 15px; color: ${SALESOS_BRAND.colors.textMedium}; line-height: 1.7;">
      Your SalesOS password was successfully updated on <strong>${formattedTime}</strong>.
    </p>

    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0 0 24px 0; background-color: ${SALESOS_BRAND.colors.successLight}; border-radius: 12px; padding: 16px 20px;">
      <tr>
        <td>
          <p style="margin: 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 14px; color: ${SALESOS_BRAND.colors.success}; font-weight: 500;">
            Your account is now secured with your new password.
          </p>
        </td>
      </tr>
    </table>

    ${formatSecurityNote("If you did not make this change, please contact our support team immediately and reset your password.")}

    <p style="margin: 24px 0 0 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 15px; color: ${SALESOS_BRAND.colors.textMedium}; line-height: 1.7;">
      You can now sign in with your new password.
    </p>
  `;

  return generateSalesOSTemplate({
    preheader: 'Your SalesOS password has been successfully updated',
    content,
    ctaButton: {
      text: 'Sign In',
      url: loginUrl,
      style: 'primary',
    },
  });
}

/**
 * Magic Link Email - Passwordless login
 */
export function generateSalesOSMagicLinkEmail(params: {
  userName?: string;
  magicLinkUrl: string;
  expirationMinutes?: number;
}): string {
  const { userName, magicLinkUrl, expirationMinutes = 15 } = params;

  const content = `
    <h1 style="margin: 0 0 8px 0; font-family: ${SALESOS_BRAND.fonts.heading}; font-size: 28px; font-weight: 600; color: ${SALESOS_BRAND.colors.textDark}; line-height: 1.3;">
      Sign In to SalesOS
    </h1>
    <p style="margin: 0 0 24px 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 15px; color: ${SALESOS_BRAND.colors.textMuted}; line-height: 1.6;">
      Click the button below to securely sign in
    </p>

    ${formatDivider()}

    <p style="margin: 0 0 16px 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 15px; color: ${SALESOS_BRAND.colors.textMedium}; line-height: 1.7;">
      ${formatGreeting(userName)}
    </p>
    <p style="margin: 0 0 24px 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 15px; color: ${SALESOS_BRAND.colors.textMedium}; line-height: 1.7;">
      Click the button below to sign in to your SalesOS account. No password needed!
    </p>

    <p style="margin: 24px 0 8px 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 13px; color: ${SALESOS_BRAND.colors.textMuted}; text-align: center;">
      This link expires in <strong>${expirationMinutes} minutes</strong>
    </p>

    ${formatSecurityNote("If you didn't request this sign-in link, you can safely ignore this email.")}
  `;

  return generateSalesOSTemplate({
    preheader: 'Your SalesOS sign-in link - expires in 15 minutes',
    content,
    ctaButton: {
      text: 'Sign In to SalesOS',
      url: magicLinkUrl,
      style: 'primary',
    },
  });
}

/**
 * Login Notification Email - Security alert for new logins
 */
export function generateSalesOSLoginNotificationEmail(params: {
  userName?: string;
  loginTime: string;
  ipAddress?: string;
  location?: string;
  device?: string;
  browser?: string;
  securitySettingsUrl: string;
}): string {
  const { userName, loginTime, ipAddress, location, device, browser, securitySettingsUrl } = params;

  const infoItems = [
    { label: 'Time', value: loginTime },
    ...(location ? [{ label: 'Location', value: location }] : []),
    ...(ipAddress ? [{ label: 'IP Address', value: ipAddress }] : []),
    ...(browser ? [{ label: 'Browser', value: browser }] : []),
    ...(device ? [{ label: 'Device', value: device }] : []),
  ];

  const content = `
    <h1 style="margin: 0 0 8px 0; font-family: ${SALESOS_BRAND.fonts.heading}; font-size: 28px; font-weight: 600; color: ${SALESOS_BRAND.colors.textDark}; line-height: 1.3;">
      New Sign-In Detected
    </h1>
    <p style="margin: 0 0 24px 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 15px; color: ${SALESOS_BRAND.colors.textMuted}; line-height: 1.6;">
      We noticed a new sign-in to your account
    </p>

    ${formatDivider()}

    <p style="margin: 0 0 16px 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 15px; color: ${SALESOS_BRAND.colors.textMedium}; line-height: 1.7;">
      ${formatGreeting(userName)}
    </p>
    <p style="margin: 0 0 24px 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 15px; color: ${SALESOS_BRAND.colors.textMedium}; line-height: 1.7;">
      Your SalesOS account was just accessed. Here are the details:
    </p>

    ${formatInfoBox('Sign-In Details', infoItems)}

    <p style="margin: 0 0 16px 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 15px; color: ${SALESOS_BRAND.colors.textMedium}; line-height: 1.7;">
      <strong>Was this you?</strong> If yes, you can ignore this message.
    </p>

    ${formatSecurityNote("If you don't recognize this activity, please secure your account immediately by changing your password.")}
  `;

  return generateSalesOSTemplate({
    preheader: 'New sign-in to your SalesOS account',
    content,
    ctaButton: {
      text: 'Review Security Settings',
      url: securitySettingsUrl,
      style: 'secondary',
    },
  });
}

/**
 * Email Verification - Verify email address
 */
export function generateSalesOSVerificationEmail(params: {
  userName?: string;
  verificationCode: string;
  verificationUrl: string;
  expirationMinutes?: number;
}): string {
  const { userName, verificationCode, verificationUrl, expirationMinutes = 60 } = params;

  const content = `
    <h1 style="margin: 0 0 8px 0; font-family: ${SALESOS_BRAND.fonts.heading}; font-size: 28px; font-weight: 600; color: ${SALESOS_BRAND.colors.textDark}; line-height: 1.3;">
      Verify Your Email
    </h1>
    <p style="margin: 0 0 24px 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 15px; color: ${SALESOS_BRAND.colors.textMuted}; line-height: 1.6;">
      Complete your account setup
    </p>

    ${formatDivider()}

    <p style="margin: 0 0 16px 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 15px; color: ${SALESOS_BRAND.colors.textMedium}; line-height: 1.7;">
      ${formatGreeting(userName)}
    </p>
    <p style="margin: 0 0 24px 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 15px; color: ${SALESOS_BRAND.colors.textMedium}; line-height: 1.7;">
      Please verify your email address to complete your SalesOS account setup. Use the code below:
    </p>

    ${formatCodeBox(verificationCode)}

    <p style="margin: 0 0 8px 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 13px; color: ${SALESOS_BRAND.colors.textMuted}; text-align: center;">
      This code expires in <strong>${expirationMinutes} minutes</strong>
    </p>

    <p style="margin: 24px 0 0 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 15px; color: ${SALESOS_BRAND.colors.textMedium}; line-height: 1.7;">
      Or click the button below to verify automatically:
    </p>
  `;

  return generateSalesOSTemplate({
    preheader: `Your SalesOS verification code is ${verificationCode}`,
    content,
    ctaButton: {
      text: 'Verify Email',
      url: verificationUrl,
      style: 'primary',
    },
  });
}

/**
 * Invitation Email - Invite team member
 */
export function generateSalesOSInvitationEmail(params: {
  inviterName: string;
  organizationName: string;
  inviteUrl: string;
  role?: string;
  expirationDays?: number;
}): string {
  const { inviterName, organizationName, inviteUrl, role = 'team member', expirationDays = 7 } = params;

  const content = `
    <h1 style="margin: 0 0 8px 0; font-family: ${SALESOS_BRAND.fonts.heading}; font-size: 28px; font-weight: 600; color: ${SALESOS_BRAND.colors.textDark}; line-height: 1.3;">
      You're Invited
    </h1>
    <p style="margin: 0 0 24px 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 15px; color: ${SALESOS_BRAND.colors.textMuted}; line-height: 1.6;">
      Join ${organizationName} on SalesOS
    </p>

    ${formatDivider()}

    <p style="margin: 0 0 16px 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 15px; color: ${SALESOS_BRAND.colors.textMedium}; line-height: 1.7;">
      Hi there,
    </p>
    <p style="margin: 0 0 16px 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 15px; color: ${SALESOS_BRAND.colors.textMedium}; line-height: 1.7;">
      <strong>${inviterName}</strong> has invited you to join <strong>${organizationName}</strong> on SalesOS as a <strong>${role}</strong>.
    </p>
    <p style="margin: 0 0 24px 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 15px; color: ${SALESOS_BRAND.colors.textMedium}; line-height: 1.7;">
      SalesOS is an AI-powered sales platform that helps teams close more deals, faster.
    </p>

    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0 0 24px 0; background-color: ${SALESOS_BRAND.colors.goldLight}; border-radius: 12px; padding: 16px 20px;">
      <tr>
        <td>
          <p style="margin: 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 13px; color: ${SALESOS_BRAND.colors.textMedium};">
            This invitation expires in <strong>${expirationDays} days</strong>
          </p>
        </td>
      </tr>
    </table>
  `;

  return generateSalesOSTemplate({
    preheader: `${inviterName} invited you to join ${organizationName} on SalesOS`,
    content,
    ctaButton: {
      text: 'Accept Invitation',
      url: inviteUrl,
      style: 'primary',
    },
  });
}

/**
 * Account Setup Complete - Welcome after completing onboarding
 */
export function generateSalesOSSetupCompleteEmail(params: {
  userName: string;
  dashboardUrl: string;
  features?: string[];
}): string {
  const { userName, dashboardUrl, features = ['Lead Management', 'Deal Pipeline', 'AI Insights', 'Email Integration'] } = params;

  const featuresHtml = features.map(feature => `
    <tr>
      <td style="padding: 10px 0; border-bottom: 1px solid ${SALESOS_BRAND.colors.borderLight};">
        <span style="font-family: ${SALESOS_BRAND.fonts.body}; font-size: 14px; color: ${SALESOS_BRAND.colors.textDark};">&#10003; ${feature}</span>
      </td>
    </tr>
  `).join('');

  const content = `
    <h1 style="margin: 0 0 8px 0; font-family: ${SALESOS_BRAND.fonts.heading}; font-size: 28px; font-weight: 600; color: ${SALESOS_BRAND.colors.textDark}; line-height: 1.3;">
      You're All Set!
    </h1>
    <p style="margin: 0 0 24px 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 15px; color: ${SALESOS_BRAND.colors.textMuted}; line-height: 1.6;">
      Your SalesOS account is ready to use
    </p>

    ${formatDivider()}

    <p style="margin: 0 0 16px 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 15px; color: ${SALESOS_BRAND.colors.textMedium}; line-height: 1.7;">
      ${formatGreeting(userName)}
    </p>
    <p style="margin: 0 0 24px 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 15px; color: ${SALESOS_BRAND.colors.textMedium}; line-height: 1.7;">
      Congratulations! Your account setup is complete and you now have access to all SalesOS features:
    </p>

    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0 0 24px 0;">
      ${featuresHtml}
    </table>

    <p style="margin: 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 15px; color: ${SALESOS_BRAND.colors.textMedium}; line-height: 1.7;">
      Start exploring your dashboard and supercharge your sales process.
    </p>
  `;

  return generateSalesOSTemplate({
    preheader: 'Your SalesOS account setup is complete - start selling smarter',
    content,
    ctaButton: {
      text: 'Open Dashboard',
      url: dashboardUrl,
      style: 'gold',
    },
  });
}

/**
 * Trial Ending Soon - Reminder before trial expires
 */
export function generateSalesOSTrialEndingEmail(params: {
  userName: string;
  daysRemaining: number;
  upgradeUrl: string;
  features?: { name: string; description: string }[];
}): string {
  const { userName, daysRemaining, upgradeUrl, features } = params;

  const defaultFeatures = [
    { name: 'Unlimited Leads', description: 'No caps on your pipeline' },
    { name: 'Advanced AI', description: 'Full scoring and recommendations' },
    { name: 'Priority Support', description: '24/7 dedicated assistance' },
  ];

  const featuresHtml = (features || defaultFeatures).map(f => `
    <tr>
      <td style="padding: 12px 0; border-bottom: 1px solid ${SALESOS_BRAND.colors.borderLight};">
        <span style="font-family: ${SALESOS_BRAND.fonts.body}; font-size: 14px; color: ${SALESOS_BRAND.colors.textDark}; font-weight: 500;">${f.name}</span>
        <span style="font-family: ${SALESOS_BRAND.fonts.body}; font-size: 13px; color: ${SALESOS_BRAND.colors.textMuted}; display: block; margin-top: 4px;">${f.description}</span>
      </td>
    </tr>
  `).join('');

  const content = `
    <h1 style="margin: 0 0 8px 0; font-family: ${SALESOS_BRAND.fonts.heading}; font-size: 28px; font-weight: 600; color: ${SALESOS_BRAND.colors.textDark}; line-height: 1.3;">
      ${daysRemaining} Day${daysRemaining !== 1 ? 's' : ''} Left
    </h1>
    <p style="margin: 0 0 24px 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 15px; color: ${SALESOS_BRAND.colors.textMuted}; line-height: 1.6;">
      Your SalesOS trial is ending soon
    </p>

    ${formatDivider()}

    <p style="margin: 0 0 16px 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 15px; color: ${SALESOS_BRAND.colors.textMedium}; line-height: 1.7;">
      ${formatGreeting(userName)}
    </p>
    <p style="margin: 0 0 24px 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 15px; color: ${SALESOS_BRAND.colors.textMedium}; line-height: 1.7;">
      Your free trial of SalesOS will expire in <strong>${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}</strong>. Upgrade now to keep access to all premium features:
    </p>

    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0 0 24px 0;">
      ${featuresHtml}
    </table>

    <p style="margin: 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 15px; color: ${SALESOS_BRAND.colors.textMedium}; line-height: 1.7;">
      Don't let your momentum stop. Upgrade today and keep closing deals.
    </p>
  `;

  return generateSalesOSTemplate({
    preheader: `Only ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} left on your SalesOS trial`,
    content,
    ctaButton: {
      text: 'Upgrade Now',
      url: upgradeUrl,
      style: 'gold',
    },
  });
}

/**
 * Account Deactivation Warning
 */
export function generateSalesOSDeactivationWarningEmail(params: {
  userName: string;
  deactivationDate: string;
  reactivateUrl: string;
  reason?: string;
}): string {
  const { userName, deactivationDate, reactivateUrl, reason = 'inactivity' } = params;

  const content = `
    <h1 style="margin: 0 0 8px 0; font-family: ${SALESOS_BRAND.fonts.heading}; font-size: 28px; font-weight: 600; color: ${SALESOS_BRAND.colors.textDark}; line-height: 1.3;">
      Account Notice
    </h1>
    <p style="margin: 0 0 24px 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 15px; color: ${SALESOS_BRAND.colors.textMuted}; line-height: 1.6;">
      Action required to keep your account active
    </p>

    ${formatDivider()}

    <p style="margin: 0 0 16px 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 15px; color: ${SALESOS_BRAND.colors.textMedium}; line-height: 1.7;">
      ${formatGreeting(userName)}
    </p>
    <p style="margin: 0 0 24px 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 15px; color: ${SALESOS_BRAND.colors.textMedium}; line-height: 1.7;">
      Due to ${reason}, your SalesOS account is scheduled for deactivation on <strong>${deactivationDate}</strong>.
    </p>

    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0 0 24px 0; background-color: ${SALESOS_BRAND.colors.warningLight}; border-radius: 12px; padding: 16px 20px; border-left: 4px solid ${SALESOS_BRAND.colors.warning};">
      <tr>
        <td>
          <p style="margin: 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 14px; color: ${SALESOS_BRAND.colors.textMedium};">
            <strong>What happens after deactivation?</strong><br>
            Your data will be retained for 30 days, after which it may be permanently deleted.
          </p>
        </td>
      </tr>
    </table>

    <p style="margin: 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 15px; color: ${SALESOS_BRAND.colors.textMedium}; line-height: 1.7;">
      To keep your account active, simply sign in before the deactivation date.
    </p>
  `;

  return generateSalesOSTemplate({
    preheader: 'Action required: Your SalesOS account will be deactivated',
    content,
    ctaButton: {
      text: 'Keep Account Active',
      url: reactivateUrl,
      style: 'primary',
    },
  });
}

// ==================== BILLING TEMPLATES ====================

/**
 * Subscription Confirmed - After successful plan upgrade
 */
export function generateSalesOSSubscriptionConfirmedEmail(params: {
  userName: string;
  planName: string;
  amount: string;
  billingCycle: 'monthly' | 'yearly';
  nextBillingDate: string;
  dashboardUrl: string;
  features?: string[];
}): string {
  const { userName, planName, amount, billingCycle, nextBillingDate, dashboardUrl, features } = params;

  const defaultFeatures = ['Unlimited contacts', 'AI-powered insights', 'Advanced reporting', 'Priority support'];
  const featuresHtml = (features || defaultFeatures).map(f => `
    <tr>
      <td style="padding: 8px 0;">
        <span style="font-family: ${SALESOS_BRAND.fonts.body}; font-size: 14px; color: ${SALESOS_BRAND.colors.success};">&#10003;</span>
        <span style="font-family: ${SALESOS_BRAND.fonts.body}; font-size: 14px; color: ${SALESOS_BRAND.colors.textDark}; margin-left: 8px;">${f}</span>
      </td>
    </tr>
  `).join('');

  const content = `
    <h1 style="margin: 0 0 8px 0; font-family: ${SALESOS_BRAND.fonts.heading}; font-size: 28px; font-weight: 600; color: ${SALESOS_BRAND.colors.textDark}; line-height: 1.3;">
      Welcome to ${planName}!
    </h1>
    <p style="margin: 0 0 24px 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 15px; color: ${SALESOS_BRAND.colors.textMuted}; line-height: 1.6;">
      Your subscription is now active
    </p>

    ${formatDivider()}

    <p style="margin: 0 0 16px 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 15px; color: ${SALESOS_BRAND.colors.textMedium}; line-height: 1.7;">
      ${formatGreeting(userName)}
    </p>
    <p style="margin: 0 0 24px 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 15px; color: ${SALESOS_BRAND.colors.textMedium}; line-height: 1.7;">
      Thank you for upgrading to <strong>${planName}</strong>! Your subscription is now active and you have access to all premium features.
    </p>

    ${formatInfoBox('Subscription Details', [
      { label: 'Plan', value: planName },
      { label: 'Amount', value: `${amount}/${billingCycle === 'monthly' ? 'mo' : 'yr'}` },
      { label: 'Next billing date', value: nextBillingDate },
    ])}

    <p style="margin: 24px 0 16px 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 14px; font-weight: 600; color: ${SALESOS_BRAND.colors.textDark};">
      What's included:
    </p>
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0 0 24px 0;">
      ${featuresHtml}
    </table>
  `;

  return generateSalesOSTemplate({
    preheader: `Your ${planName} subscription is now active`,
    content,
    ctaButton: {
      text: 'Go to Dashboard',
      url: dashboardUrl,
      style: 'gold',
    },
  });
}

/**
 * Payment Receipt - After successful payment
 */
export function generateSalesOSPaymentReceiptEmail(params: {
  userName: string;
  invoiceNumber: string;
  amount: string;
  description: string;
  paymentDate: string;
  paymentMethod: string;
  invoiceUrl?: string;
}): string {
  const { userName, invoiceNumber, amount, description, paymentDate, paymentMethod, invoiceUrl } = params;

  const content = `
    <h1 style="margin: 0 0 8px 0; font-family: ${SALESOS_BRAND.fonts.heading}; font-size: 28px; font-weight: 600; color: ${SALESOS_BRAND.colors.textDark}; line-height: 1.3;">
      Payment Received
    </h1>
    <p style="margin: 0 0 24px 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 15px; color: ${SALESOS_BRAND.colors.textMuted}; line-height: 1.6;">
      Thank you for your payment
    </p>

    ${formatDivider()}

    <p style="margin: 0 0 16px 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 15px; color: ${SALESOS_BRAND.colors.textMedium}; line-height: 1.7;">
      ${formatGreeting(userName)}
    </p>
    <p style="margin: 0 0 24px 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 15px; color: ${SALESOS_BRAND.colors.textMedium}; line-height: 1.7;">
      We've received your payment. Here's your receipt:
    </p>

    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0 0 24px 0; background-color: ${SALESOS_BRAND.colors.backgroundAlt}; border-radius: 16px; padding: 24px;">
      <tr>
        <td>
          <p style="margin: 0 0 16px 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: ${SALESOS_BRAND.colors.textMuted};">
            Receipt
          </p>
          <p style="margin: 0 0 8px 0; font-family: ${SALESOS_BRAND.fonts.heading}; font-size: 32px; font-weight: 600; color: ${SALESOS_BRAND.colors.textDark};">
            ${amount}
          </p>
          <p style="margin: 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 14px; color: ${SALESOS_BRAND.colors.textMuted};">
            ${description}
          </p>
        </td>
      </tr>
    </table>

    ${formatInfoBox('Payment Details', [
      { label: 'Invoice Number', value: invoiceNumber },
      { label: 'Payment Date', value: paymentDate },
      { label: 'Payment Method', value: paymentMethod },
    ])}

    <p style="margin: 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 13px; color: ${SALESOS_BRAND.colors.textMuted}; line-height: 1.7;">
      This receipt serves as confirmation of your payment. No action is required.
    </p>
  `;

  return generateSalesOSTemplate({
    preheader: `Receipt for your SalesOS payment - ${amount}`,
    content,
    ctaButton: invoiceUrl ? {
      text: 'Download Invoice',
      url: invoiceUrl,
      style: 'secondary',
    } : undefined,
  });
}

/**
 * Payment Failed - When payment cannot be processed
 */
export function generateSalesOSPaymentFailedEmail(params: {
  userName: string;
  amount: string;
  failureReason?: string;
  retryDate?: string;
  updatePaymentUrl: string;
}): string {
  const { userName, amount, failureReason = 'Your payment method was declined', retryDate, updatePaymentUrl } = params;

  const content = `
    <h1 style="margin: 0 0 8px 0; font-family: ${SALESOS_BRAND.fonts.heading}; font-size: 28px; font-weight: 600; color: ${SALESOS_BRAND.colors.textDark}; line-height: 1.3;">
      Payment Failed
    </h1>
    <p style="margin: 0 0 24px 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 15px; color: ${SALESOS_BRAND.colors.textMuted}; line-height: 1.6;">
      We couldn't process your payment
    </p>

    ${formatDivider()}

    <p style="margin: 0 0 16px 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 15px; color: ${SALESOS_BRAND.colors.textMedium}; line-height: 1.7;">
      ${formatGreeting(userName)}
    </p>
    <p style="margin: 0 0 24px 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 15px; color: ${SALESOS_BRAND.colors.textMedium}; line-height: 1.7;">
      We were unable to process your payment of <strong>${amount}</strong> for your SalesOS subscription.
    </p>

    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0 0 24px 0; background-color: ${SALESOS_BRAND.colors.errorLight}; border-radius: 12px; padding: 16px 20px; border-left: 4px solid ${SALESOS_BRAND.colors.error};">
      <tr>
        <td>
          <p style="margin: 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 14px; color: ${SALESOS_BRAND.colors.error}; font-weight: 500;">
            ${failureReason}
          </p>
        </td>
      </tr>
    </table>

    <p style="margin: 0 0 16px 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 15px; color: ${SALESOS_BRAND.colors.textMedium}; line-height: 1.7;">
      To avoid service interruption, please update your payment method.
    </p>

    ${retryDate ? `
    <p style="margin: 0 0 24px 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 13px; color: ${SALESOS_BRAND.colors.textMuted}; line-height: 1.7;">
      We'll automatically retry on <strong>${retryDate}</strong>.
    </p>
    ` : ''}
  `;

  return generateSalesOSTemplate({
    preheader: 'Action required: Your payment could not be processed',
    content,
    ctaButton: {
      text: 'Update Payment Method',
      url: updatePaymentUrl,
      style: 'primary',
    },
  });
}

/**
 * Subscription Cancelled
 */
export function generateSalesOSSubscriptionCancelledEmail(params: {
  userName: string;
  planName: string;
  accessUntil: string;
  resubscribeUrl: string;
  reason?: string;
}): string {
  const { userName, planName, accessUntil, resubscribeUrl, reason } = params;

  const content = `
    <h1 style="margin: 0 0 8px 0; font-family: ${SALESOS_BRAND.fonts.heading}; font-size: 28px; font-weight: 600; color: ${SALESOS_BRAND.colors.textDark}; line-height: 1.3;">
      Subscription Cancelled
    </h1>
    <p style="margin: 0 0 24px 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 15px; color: ${SALESOS_BRAND.colors.textMuted}; line-height: 1.6;">
      We're sorry to see you go
    </p>

    ${formatDivider()}

    <p style="margin: 0 0 16px 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 15px; color: ${SALESOS_BRAND.colors.textMedium}; line-height: 1.7;">
      ${formatGreeting(userName)}
    </p>
    <p style="margin: 0 0 24px 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 15px; color: ${SALESOS_BRAND.colors.textMedium}; line-height: 1.7;">
      Your <strong>${planName}</strong> subscription has been cancelled${reason ? ` due to ${reason}` : ''}.
    </p>

    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0 0 24px 0; background-color: ${SALESOS_BRAND.colors.goldLight}; border-radius: 12px; padding: 16px 20px;">
      <tr>
        <td>
          <p style="margin: 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 14px; color: ${SALESOS_BRAND.colors.textMedium};">
            You'll continue to have access to premium features until <strong>${accessUntil}</strong>.
          </p>
        </td>
      </tr>
    </table>

    <p style="margin: 0 0 16px 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 15px; color: ${SALESOS_BRAND.colors.textMedium}; line-height: 1.7;">
      After this date, your account will be downgraded to our free plan. Your data will be preserved, but some features will be limited.
    </p>

    <p style="margin: 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 15px; color: ${SALESOS_BRAND.colors.textMedium}; line-height: 1.7;">
      Changed your mind? You can resubscribe anytime.
    </p>
  `;

  return generateSalesOSTemplate({
    preheader: `Your SalesOS ${planName} subscription has been cancelled`,
    content,
    ctaButton: {
      text: 'Resubscribe',
      url: resubscribeUrl,
      style: 'gold',
    },
  });
}

// ==================== CRM NOTIFICATION TEMPLATES ====================

/**
 * Deal Won Notification
 */
export function generateSalesOSDealWonEmail(params: {
  userName: string;
  dealName: string;
  dealValue: string;
  contactName: string;
  companyName?: string;
  closedDate: string;
  dashboardUrl: string;
}): string {
  const { userName, dealName, dealValue, contactName, companyName, closedDate, dashboardUrl } = params;

  const content = `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0 0 24px 0;">
      <tr>
        <td align="center">
          <div style="width: 64px; height: 64px; background-color: ${SALESOS_BRAND.colors.successLight}; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px;">
            <span style="font-size: 32px;">🎉</span>
          </div>
        </td>
      </tr>
    </table>

    <h1 style="margin: 0 0 8px 0; font-family: ${SALESOS_BRAND.fonts.heading}; font-size: 28px; font-weight: 600; color: ${SALESOS_BRAND.colors.textDark}; line-height: 1.3; text-align: center;">
      Deal Won!
    </h1>
    <p style="margin: 0 0 24px 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 15px; color: ${SALESOS_BRAND.colors.textMuted}; line-height: 1.6; text-align: center;">
      Congratulations on closing this deal
    </p>

    ${formatDivider()}

    <p style="margin: 0 0 16px 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 15px; color: ${SALESOS_BRAND.colors.textMedium}; line-height: 1.7;">
      ${formatGreeting(userName)}
    </p>
    <p style="margin: 0 0 24px 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 15px; color: ${SALESOS_BRAND.colors.textMedium}; line-height: 1.7;">
      Great news! You've successfully closed a deal.
    </p>

    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0 0 24px 0; background-color: ${SALESOS_BRAND.colors.successLight}; border-radius: 16px; padding: 24px; text-align: center;">
      <tr>
        <td>
          <p style="margin: 0 0 8px 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 14px; color: ${SALESOS_BRAND.colors.success}; font-weight: 600;">
            ${dealName}
          </p>
          <p style="margin: 0; font-family: ${SALESOS_BRAND.fonts.heading}; font-size: 36px; font-weight: 700; color: ${SALESOS_BRAND.colors.success};">
            ${dealValue}
          </p>
        </td>
      </tr>
    </table>

    ${formatInfoBox('Deal Details', [
      { label: 'Contact', value: contactName },
      ...(companyName ? [{ label: 'Company', value: companyName }] : []),
      { label: 'Closed Date', value: closedDate },
    ])}
  `;

  return generateSalesOSTemplate({
    preheader: `🎉 Deal Won: ${dealName} - ${dealValue}`,
    content,
    ctaButton: {
      text: 'View Deal',
      url: dashboardUrl,
      style: 'gold',
    },
  });
}

/**
 * Deal Lost Notification
 */
export function generateSalesOSDealLostEmail(params: {
  userName: string;
  dealName: string;
  dealValue: string;
  contactName: string;
  companyName?: string;
  lostReason?: string;
  dashboardUrl: string;
}): string {
  const { userName, dealName, dealValue, contactName, companyName, lostReason, dashboardUrl } = params;

  const content = `
    <h1 style="margin: 0 0 8px 0; font-family: ${SALESOS_BRAND.fonts.heading}; font-size: 28px; font-weight: 600; color: ${SALESOS_BRAND.colors.textDark}; line-height: 1.3;">
      Deal Lost
    </h1>
    <p style="margin: 0 0 24px 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 15px; color: ${SALESOS_BRAND.colors.textMuted}; line-height: 1.6;">
      Don't worry, there's always the next one
    </p>

    ${formatDivider()}

    <p style="margin: 0 0 16px 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 15px; color: ${SALESOS_BRAND.colors.textMedium}; line-height: 1.7;">
      ${formatGreeting(userName)}
    </p>
    <p style="margin: 0 0 24px 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 15px; color: ${SALESOS_BRAND.colors.textMedium}; line-height: 1.7;">
      Unfortunately, the following deal has been marked as lost.
    </p>

    ${formatInfoBox('Deal Details', [
      { label: 'Deal', value: dealName },
      { label: 'Value', value: dealValue },
      { label: 'Contact', value: contactName },
      ...(companyName ? [{ label: 'Company', value: companyName }] : []),
      ...(lostReason ? [{ label: 'Reason', value: lostReason }] : []),
    ])}

    <p style="margin: 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 15px; color: ${SALESOS_BRAND.colors.textMedium}; line-height: 1.7;">
      Every "no" brings you closer to a "yes". Review the deal to learn from this experience.
    </p>
  `;

  return generateSalesOSTemplate({
    preheader: `Deal Lost: ${dealName}`,
    content,
    ctaButton: {
      text: 'Review Deal',
      url: dashboardUrl,
      style: 'secondary',
    },
  });
}

/**
 * Lead Assigned Notification
 */
export function generateSalesOSLeadAssignedEmail(params: {
  userName: string;
  leadName: string;
  leadEmail?: string;
  leadCompany?: string;
  leadSource?: string;
  assignedBy?: string;
  leadUrl: string;
}): string {
  const { userName, leadName, leadEmail, leadCompany, leadSource, assignedBy, leadUrl } = params;

  const content = `
    <h1 style="margin: 0 0 8px 0; font-family: ${SALESOS_BRAND.fonts.heading}; font-size: 28px; font-weight: 600; color: ${SALESOS_BRAND.colors.textDark}; line-height: 1.3;">
      New Lead Assigned
    </h1>
    <p style="margin: 0 0 24px 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 15px; color: ${SALESOS_BRAND.colors.textMuted}; line-height: 1.6;">
      You have a new lead to follow up with
    </p>

    ${formatDivider()}

    <p style="margin: 0 0 16px 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 15px; color: ${SALESOS_BRAND.colors.textMedium}; line-height: 1.7;">
      ${formatGreeting(userName)}
    </p>
    <p style="margin: 0 0 24px 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 15px; color: ${SALESOS_BRAND.colors.textMedium}; line-height: 1.7;">
      ${assignedBy ? `<strong>${assignedBy}</strong> has assigned` : 'A new lead has been assigned'} to you:
    </p>

    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0 0 24px 0; background-color: ${SALESOS_BRAND.colors.goldLight}; border-radius: 16px; padding: 20px;">
      <tr>
        <td>
          <p style="margin: 0 0 4px 0; font-family: ${SALESOS_BRAND.fonts.heading}; font-size: 18px; font-weight: 600; color: ${SALESOS_BRAND.colors.textDark};">
            ${leadName}
          </p>
          ${leadCompany ? `<p style="margin: 0 0 4px 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 14px; color: ${SALESOS_BRAND.colors.textMedium};">${leadCompany}</p>` : ''}
          ${leadEmail ? `<p style="margin: 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 14px; color: ${SALESOS_BRAND.colors.textMuted};">${leadEmail}</p>` : ''}
        </td>
      </tr>
    </table>

    ${leadSource ? formatInfoBox('Lead Info', [{ label: 'Source', value: leadSource }]) : ''}

    <p style="margin: 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 15px; color: ${SALESOS_BRAND.colors.textMedium}; line-height: 1.7;">
      Reach out soon while the lead is still warm!
    </p>
  `;

  return generateSalesOSTemplate({
    preheader: `New lead assigned: ${leadName}${leadCompany ? ` from ${leadCompany}` : ''}`,
    content,
    ctaButton: {
      text: 'View Lead',
      url: leadUrl,
      style: 'primary',
    },
  });
}

/**
 * Task Reminder
 */
export function generateSalesOSTaskReminderEmail(params: {
  userName: string;
  taskTitle: string;
  taskDescription?: string;
  dueDate: string;
  dueTime?: string;
  relatedTo?: { type: string; name: string };
  taskUrl: string;
}): string {
  const { userName, taskTitle, taskDescription, dueDate, dueTime, relatedTo, taskUrl } = params;

  const content = `
    <h1 style="margin: 0 0 8px 0; font-family: ${SALESOS_BRAND.fonts.heading}; font-size: 28px; font-weight: 600; color: ${SALESOS_BRAND.colors.textDark}; line-height: 1.3;">
      Task Reminder
    </h1>
    <p style="margin: 0 0 24px 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 15px; color: ${SALESOS_BRAND.colors.textMuted}; line-height: 1.6;">
      You have an upcoming task
    </p>

    ${formatDivider()}

    <p style="margin: 0 0 16px 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 15px; color: ${SALESOS_BRAND.colors.textMedium}; line-height: 1.7;">
      ${formatGreeting(userName)}
    </p>
    <p style="margin: 0 0 24px 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 15px; color: ${SALESOS_BRAND.colors.textMedium}; line-height: 1.7;">
      This is a reminder about your upcoming task:
    </p>

    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0 0 24px 0; background-color: ${SALESOS_BRAND.colors.backgroundAlt}; border-radius: 16px; padding: 20px; border-left: 4px solid ${SALESOS_BRAND.colors.gold};">
      <tr>
        <td>
          <p style="margin: 0 0 8px 0; font-family: ${SALESOS_BRAND.fonts.heading}; font-size: 16px; font-weight: 600; color: ${SALESOS_BRAND.colors.textDark};">
            ${taskTitle}
          </p>
          ${taskDescription ? `<p style="margin: 0 0 12px 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 14px; color: ${SALESOS_BRAND.colors.textMedium};">${taskDescription}</p>` : ''}
          <p style="margin: 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 13px; color: ${SALESOS_BRAND.colors.textMuted};">
            Due: <strong>${dueDate}</strong>${dueTime ? ` at <strong>${dueTime}</strong>` : ''}
          </p>
        </td>
      </tr>
    </table>

    ${relatedTo ? formatInfoBox('Related To', [{ label: relatedTo.type, value: relatedTo.name }]) : ''}
  `;

  return generateSalesOSTemplate({
    preheader: `Task reminder: ${taskTitle} - Due ${dueDate}`,
    content,
    ctaButton: {
      text: 'View Task',
      url: taskUrl,
      style: 'primary',
    },
  });
}

/**
 * Task Overdue
 */
export function generateSalesOSTaskOverdueEmail(params: {
  userName: string;
  taskTitle: string;
  taskDescription?: string;
  dueDate: string;
  daysOverdue: number;
  relatedTo?: { type: string; name: string };
  taskUrl: string;
}): string {
  const { userName, taskTitle, taskDescription, dueDate, daysOverdue, relatedTo, taskUrl } = params;

  const content = `
    <h1 style="margin: 0 0 8px 0; font-family: ${SALESOS_BRAND.fonts.heading}; font-size: 28px; font-weight: 600; color: ${SALESOS_BRAND.colors.textDark}; line-height: 1.3;">
      Task Overdue
    </h1>
    <p style="margin: 0 0 24px 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 15px; color: ${SALESOS_BRAND.colors.textMuted}; line-height: 1.6;">
      A task needs your attention
    </p>

    ${formatDivider()}

    <p style="margin: 0 0 16px 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 15px; color: ${SALESOS_BRAND.colors.textMedium}; line-height: 1.7;">
      ${formatGreeting(userName)}
    </p>
    <p style="margin: 0 0 24px 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 15px; color: ${SALESOS_BRAND.colors.textMedium}; line-height: 1.7;">
      The following task is now overdue and requires your attention:
    </p>

    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0 0 24px 0; background-color: ${SALESOS_BRAND.colors.errorLight}; border-radius: 16px; padding: 20px; border-left: 4px solid ${SALESOS_BRAND.colors.error};">
      <tr>
        <td>
          <p style="margin: 0 0 8px 0; font-family: ${SALESOS_BRAND.fonts.heading}; font-size: 16px; font-weight: 600; color: ${SALESOS_BRAND.colors.textDark};">
            ${taskTitle}
          </p>
          ${taskDescription ? `<p style="margin: 0 0 12px 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 14px; color: ${SALESOS_BRAND.colors.textMedium};">${taskDescription}</p>` : ''}
          <p style="margin: 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 13px; color: ${SALESOS_BRAND.colors.error}; font-weight: 500;">
            Was due: ${dueDate} (${daysOverdue} day${daysOverdue !== 1 ? 's' : ''} overdue)
          </p>
        </td>
      </tr>
    </table>

    ${relatedTo ? formatInfoBox('Related To', [{ label: relatedTo.type, value: relatedTo.name }]) : ''}
  `;

  return generateSalesOSTemplate({
    preheader: `⚠️ Overdue: ${taskTitle} - ${daysOverdue} day${daysOverdue !== 1 ? 's' : ''} past due`,
    content,
    ctaButton: {
      text: 'Complete Task',
      url: taskUrl,
      style: 'primary',
    },
  });
}

/**
 * Meeting Reminder
 */
export function generateSalesOSMeetingReminderEmail(params: {
  userName: string;
  meetingTitle: string;
  meetingDate: string;
  meetingTime: string;
  duration?: string;
  attendees?: string[];
  location?: string;
  meetingUrl?: string;
  calendarUrl: string;
}): string {
  const { userName, meetingTitle, meetingDate, meetingTime, duration, attendees, location, meetingUrl, calendarUrl } = params;

  const attendeesHtml = attendees && attendees.length > 0 ? `
    <p style="margin: 12px 0 0 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 13px; color: ${SALESOS_BRAND.colors.textMuted};">
      <strong>Attendees:</strong> ${attendees.join(', ')}
    </p>
  ` : '';

  const content = `
    <h1 style="margin: 0 0 8px 0; font-family: ${SALESOS_BRAND.fonts.heading}; font-size: 28px; font-weight: 600; color: ${SALESOS_BRAND.colors.textDark}; line-height: 1.3;">
      Meeting Reminder
    </h1>
    <p style="margin: 0 0 24px 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 15px; color: ${SALESOS_BRAND.colors.textMuted}; line-height: 1.6;">
      Your meeting is coming up soon
    </p>

    ${formatDivider()}

    <p style="margin: 0 0 16px 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 15px; color: ${SALESOS_BRAND.colors.textMedium}; line-height: 1.7;">
      ${formatGreeting(userName)}
    </p>
    <p style="margin: 0 0 24px 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 15px; color: ${SALESOS_BRAND.colors.textMedium}; line-height: 1.7;">
      You have an upcoming meeting:
    </p>

    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0 0 24px 0; background-color: ${SALESOS_BRAND.colors.goldLight}; border-radius: 16px; padding: 20px;">
      <tr>
        <td>
          <p style="margin: 0 0 8px 0; font-family: ${SALESOS_BRAND.fonts.heading}; font-size: 18px; font-weight: 600; color: ${SALESOS_BRAND.colors.textDark};">
            ${meetingTitle}
          </p>
          <p style="margin: 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 14px; color: ${SALESOS_BRAND.colors.textMedium};">
            📅 ${meetingDate} at ${meetingTime}${duration ? ` (${duration})` : ''}
          </p>
          ${location ? `<p style="margin: 8px 0 0 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 14px; color: ${SALESOS_BRAND.colors.textMedium};">📍 ${location}</p>` : ''}
          ${meetingUrl ? `<p style="margin: 8px 0 0 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 14px; color: ${SALESOS_BRAND.colors.textMedium};">🔗 <a href="${meetingUrl}" style="color: ${SALESOS_BRAND.colors.dark};">Join Meeting</a></p>` : ''}
          ${attendeesHtml}
        </td>
      </tr>
    </table>
  `;

  return generateSalesOSTemplate({
    preheader: `Meeting reminder: ${meetingTitle} - ${meetingDate} at ${meetingTime}`,
    content,
    ctaButton: {
      text: 'View in Calendar',
      url: calendarUrl,
      style: 'primary',
    },
  });
}

/**
 * Lead Converted to Deal - When a lead is converted
 */
export function generateSalesOSLeadConvertedEmail(params: {
  userName: string;
  leadName: string;
  leadCompany?: string;
  dealName: string;
  dealValue?: string;
  dealStage: string;
  convertedBy?: string;
  dealUrl: string;
}): string {
  const { userName, leadName, leadCompany, dealName, dealValue, dealStage, convertedBy, dealUrl } = params;

  const content = `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0 0 24px 0;">
      <tr>
        <td align="center">
          <div style="width: 64px; height: 64px; background-color: ${SALESOS_BRAND.colors.goldLight}; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px;">
            <span style="font-size: 32px;">🚀</span>
          </div>
        </td>
      </tr>
    </table>

    <h1 style="margin: 0 0 8px 0; font-family: ${SALESOS_BRAND.fonts.heading}; font-size: 28px; font-weight: 600; color: ${SALESOS_BRAND.colors.textDark}; line-height: 1.3; text-align: center;">
      Lead Converted!
    </h1>
    <p style="margin: 0 0 24px 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 15px; color: ${SALESOS_BRAND.colors.textMuted}; line-height: 1.6; text-align: center;">
      A lead has been converted to a deal
    </p>

    ${formatDivider()}

    <p style="margin: 0 0 16px 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 15px; color: ${SALESOS_BRAND.colors.textMedium}; line-height: 1.7;">
      ${formatGreeting(userName)}
    </p>
    <p style="margin: 0 0 24px 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 15px; color: ${SALESOS_BRAND.colors.textMedium}; line-height: 1.7;">
      ${convertedBy ? `<strong>${convertedBy}</strong> has converted` : 'A lead has been converted to'} a new deal opportunity.
    </p>

    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0 0 24px 0;">
      <tr>
        <td width="48%" style="background-color: ${SALESOS_BRAND.colors.backgroundAlt}; border-radius: 12px; padding: 16px; vertical-align: top;">
          <p style="margin: 0 0 4px 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: ${SALESOS_BRAND.colors.textMuted};">
            Lead
          </p>
          <p style="margin: 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 14px; font-weight: 500; color: ${SALESOS_BRAND.colors.textDark};">
            ${leadName}
          </p>
          ${leadCompany ? `<p style="margin: 4px 0 0 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 13px; color: ${SALESOS_BRAND.colors.textMuted};">${leadCompany}</p>` : ''}
        </td>
        <td width="4%" style="text-align: center; vertical-align: middle;">
          <span style="font-size: 20px; color: ${SALESOS_BRAND.colors.gold};">→</span>
        </td>
        <td width="48%" style="background-color: ${SALESOS_BRAND.colors.goldLight}; border-radius: 12px; padding: 16px; vertical-align: top;">
          <p style="margin: 0 0 4px 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: ${SALESOS_BRAND.colors.textMuted};">
            Deal
          </p>
          <p style="margin: 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 14px; font-weight: 500; color: ${SALESOS_BRAND.colors.textDark};">
            ${dealName}
          </p>
          ${dealValue ? `<p style="margin: 4px 0 0 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 15px; font-weight: 600; color: ${SALESOS_BRAND.colors.success};">${dealValue}</p>` : ''}
        </td>
      </tr>
    </table>

    ${formatInfoBox('Deal Info', [
      { label: 'Stage', value: dealStage },
      ...(dealValue ? [{ label: 'Value', value: dealValue }] : []),
    ])}

    <p style="margin: 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 15px; color: ${SALESOS_BRAND.colors.textMedium}; line-height: 1.7;">
      View the deal to start working on this opportunity.
    </p>
  `;

  return generateSalesOSTemplate({
    preheader: `Lead converted: ${leadName} → ${dealName}${dealValue ? ` (${dealValue})` : ''}`,
    content,
    ctaButton: {
      text: 'View Deal',
      url: dealUrl,
      style: 'gold',
    },
  });
}

/**
 * Follow-up Reminder - Reminder to follow up with a contact
 */
export function generateSalesOSFollowUpReminderEmail(params: {
  userName: string;
  contactName: string;
  contactEmail?: string;
  contactCompany?: string;
  lastActivityType?: string;
  lastActivityDate?: string;
  daysSinceContact: number;
  suggestedAction?: string;
  contactUrl: string;
}): string {
  const { userName, contactName, contactEmail, contactCompany, lastActivityType, lastActivityDate, daysSinceContact, suggestedAction, contactUrl } = params;

  const urgencyColor = daysSinceContact > 14
    ? SALESOS_BRAND.colors.error
    : daysSinceContact > 7
      ? SALESOS_BRAND.colors.warning
      : SALESOS_BRAND.colors.textMuted;

  const urgencyBg = daysSinceContact > 14
    ? SALESOS_BRAND.colors.errorLight
    : daysSinceContact > 7
      ? SALESOS_BRAND.colors.warningLight
      : SALESOS_BRAND.colors.backgroundAlt;

  const content = `
    <h1 style="margin: 0 0 8px 0; font-family: ${SALESOS_BRAND.fonts.heading}; font-size: 28px; font-weight: 600; color: ${SALESOS_BRAND.colors.textDark}; line-height: 1.3;">
      Follow-up Reminder
    </h1>
    <p style="margin: 0 0 24px 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 15px; color: ${SALESOS_BRAND.colors.textMuted}; line-height: 1.6;">
      Time to reconnect with a contact
    </p>

    ${formatDivider()}

    <p style="margin: 0 0 16px 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 15px; color: ${SALESOS_BRAND.colors.textMedium}; line-height: 1.7;">
      ${formatGreeting(userName)}
    </p>
    <p style="margin: 0 0 24px 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 15px; color: ${SALESOS_BRAND.colors.textMedium}; line-height: 1.7;">
      It's been a while since you connected with this contact. Consider reaching out to keep the relationship warm.
    </p>

    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0 0 24px 0; background-color: ${SALESOS_BRAND.colors.goldLight}; border-radius: 16px; padding: 20px;">
      <tr>
        <td>
          <p style="margin: 0 0 4px 0; font-family: ${SALESOS_BRAND.fonts.heading}; font-size: 18px; font-weight: 600; color: ${SALESOS_BRAND.colors.textDark};">
            ${contactName}
          </p>
          ${contactCompany ? `<p style="margin: 0 0 4px 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 14px; color: ${SALESOS_BRAND.colors.textMedium};">${contactCompany}</p>` : ''}
          ${contactEmail ? `<p style="margin: 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 14px; color: ${SALESOS_BRAND.colors.textMuted};">${contactEmail}</p>` : ''}
        </td>
      </tr>
    </table>

    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0 0 24px 0; background-color: ${urgencyBg}; border-radius: 12px; padding: 16px 20px;">
      <tr>
        <td>
          <p style="margin: 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 14px; color: ${urgencyColor}; font-weight: 500;">
            ⏰ <strong>${daysSinceContact} days</strong> since last contact${lastActivityType ? ` (${lastActivityType})` : ''}
          </p>
          ${lastActivityDate ? `<p style="margin: 4px 0 0 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 13px; color: ${SALESOS_BRAND.colors.textMuted};">Last activity: ${lastActivityDate}</p>` : ''}
        </td>
      </tr>
    </table>

    ${suggestedAction ? `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0 0 24px 0;">
      <tr>
        <td style="background-color: ${SALESOS_BRAND.colors.backgroundAlt}; border-radius: 12px; padding: 16px 20px; border-left: 4px solid ${SALESOS_BRAND.colors.gold};">
          <p style="margin: 0 0 4px 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: ${SALESOS_BRAND.colors.textMuted};">
            Suggested Action
          </p>
          <p style="margin: 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 14px; color: ${SALESOS_BRAND.colors.textDark};">
            ${suggestedAction}
          </p>
        </td>
      </tr>
    </table>
    ` : ''}
  `;

  return generateSalesOSTemplate({
    preheader: `Follow up with ${contactName} - ${daysSinceContact} days since last contact`,
    content,
    ctaButton: {
      text: 'View Contact',
      url: contactUrl,
      style: 'primary',
    },
  });
}

/**
 * Stale Deal Alert - Deal hasn't moved stages
 */
export function generateSalesOSStaleDealAlertEmail(params: {
  userName: string;
  dealName: string;
  dealValue: string;
  currentStage: string;
  daysInStage: number;
  contactName?: string;
  companyName?: string;
  lastActivityDate?: string;
  suggestedActions?: string[];
  dealUrl: string;
}): string {
  const { userName, dealName, dealValue, currentStage, daysInStage, contactName, companyName, lastActivityDate, suggestedActions, dealUrl } = params;

  const urgencyLevel = daysInStage > 30 ? 'critical' : daysInStage > 14 ? 'warning' : 'info';
  const urgencyColor = urgencyLevel === 'critical'
    ? SALESOS_BRAND.colors.error
    : urgencyLevel === 'warning'
      ? SALESOS_BRAND.colors.warning
      : SALESOS_BRAND.colors.textMuted;
  const urgencyBg = urgencyLevel === 'critical'
    ? SALESOS_BRAND.colors.errorLight
    : urgencyLevel === 'warning'
      ? SALESOS_BRAND.colors.warningLight
      : SALESOS_BRAND.colors.backgroundAlt;
  const urgencyIcon = urgencyLevel === 'critical' ? '🚨' : urgencyLevel === 'warning' ? '⚠️' : '📊';

  const defaultSuggestions = [
    'Schedule a call to check on decision timeline',
    'Send relevant case study or resource',
    'Offer a product demo or trial extension',
    'Connect with other stakeholders',
  ];

  const actionsHtml = (suggestedActions || defaultSuggestions).slice(0, 4).map(action => `
    <tr>
      <td style="padding: 8px 0; border-bottom: 1px solid ${SALESOS_BRAND.colors.borderLight};">
        <span style="font-family: ${SALESOS_BRAND.fonts.body}; font-size: 14px; color: ${SALESOS_BRAND.colors.textDark};">• ${action}</span>
      </td>
    </tr>
  `).join('');

  const content = `
    <h1 style="margin: 0 0 8px 0; font-family: ${SALESOS_BRAND.fonts.heading}; font-size: 28px; font-weight: 600; color: ${SALESOS_BRAND.colors.textDark}; line-height: 1.3;">
      ${urgencyIcon} Stale Deal Alert
    </h1>
    <p style="margin: 0 0 24px 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 15px; color: ${SALESOS_BRAND.colors.textMuted}; line-height: 1.6;">
      A deal needs your attention
    </p>

    ${formatDivider()}

    <p style="margin: 0 0 16px 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 15px; color: ${SALESOS_BRAND.colors.textMedium}; line-height: 1.7;">
      ${formatGreeting(userName)}
    </p>
    <p style="margin: 0 0 24px 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 15px; color: ${SALESOS_BRAND.colors.textMedium}; line-height: 1.7;">
      The following deal hasn't progressed recently and may need action to keep it moving forward.
    </p>

    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0 0 16px 0; background-color: ${urgencyBg}; border-radius: 16px; padding: 20px; border-left: 4px solid ${urgencyColor};">
      <tr>
        <td>
          <p style="margin: 0 0 8px 0; font-family: ${SALESOS_BRAND.fonts.heading}; font-size: 18px; font-weight: 600; color: ${SALESOS_BRAND.colors.textDark};">
            ${dealName}
          </p>
          <p style="margin: 0 0 8px 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 20px; font-weight: 700; color: ${SALESOS_BRAND.colors.textDark};">
            ${dealValue}
          </p>
          <p style="margin: 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 14px; color: ${urgencyColor}; font-weight: 500;">
            Stuck in "${currentStage}" for <strong>${daysInStage} days</strong>
          </p>
        </td>
      </tr>
    </table>

    ${formatInfoBox('Deal Details', [
      { label: 'Current Stage', value: currentStage },
      { label: 'Days in Stage', value: `${daysInStage} days` },
      ...(contactName ? [{ label: 'Contact', value: contactName }] : []),
      ...(companyName ? [{ label: 'Company', value: companyName }] : []),
      ...(lastActivityDate ? [{ label: 'Last Activity', value: lastActivityDate }] : []),
    ])}

    <p style="margin: 24px 0 12px 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: ${SALESOS_BRAND.colors.textMuted};">
      Suggested Actions
    </p>
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0 0 24px 0;">
      ${actionsHtml}
    </table>
  `;

  return generateSalesOSTemplate({
    preheader: `${urgencyIcon} Stale deal: ${dealName} (${dealValue}) - ${daysInStage} days in ${currentStage}`,
    content,
    ctaButton: {
      text: 'Review Deal',
      url: dealUrl,
      style: 'primary',
    },
  });
}

// ==================== QUOTE & ORDER TEMPLATES ====================

/**
 * Quote Sent Notification
 */
export function generateSalesOSQuoteSentEmail(params: {
  userName: string;
  quoteName: string;
  quoteNumber: string;
  quoteAmount: string;
  recipientName: string;
  recipientEmail: string;
  validUntil: string;
  quoteUrl: string;
}): string {
  const { userName, quoteName, quoteNumber, quoteAmount, recipientName, recipientEmail, validUntil, quoteUrl } = params;

  const content = `
    <h1 style="margin: 0 0 8px 0; font-family: ${SALESOS_BRAND.fonts.heading}; font-size: 28px; font-weight: 600; color: ${SALESOS_BRAND.colors.textDark}; line-height: 1.3;">
      Quote Sent
    </h1>
    <p style="margin: 0 0 24px 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 15px; color: ${SALESOS_BRAND.colors.textMuted}; line-height: 1.6;">
      Your quote has been delivered
    </p>

    ${formatDivider()}

    <p style="margin: 0 0 16px 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 15px; color: ${SALESOS_BRAND.colors.textMedium}; line-height: 1.7;">
      ${formatGreeting(userName)}
    </p>
    <p style="margin: 0 0 24px 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 15px; color: ${SALESOS_BRAND.colors.textMedium}; line-height: 1.7;">
      Your quote has been sent successfully:
    </p>

    ${formatInfoBox('Quote Details', [
      { label: 'Quote', value: quoteName },
      { label: 'Number', value: quoteNumber },
      { label: 'Amount', value: quoteAmount },
      { label: 'Sent To', value: `${recipientName} (${recipientEmail})` },
      { label: 'Valid Until', value: validUntil },
    ])}

    <p style="margin: 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 15px; color: ${SALESOS_BRAND.colors.textMedium}; line-height: 1.7;">
      You'll be notified when the recipient views or accepts the quote.
    </p>
  `;

  return generateSalesOSTemplate({
    preheader: `Quote sent: ${quoteName} - ${quoteAmount}`,
    content,
    ctaButton: {
      text: 'View Quote',
      url: quoteUrl,
      style: 'primary',
    },
  });
}

/**
 * Quote Accepted
 */
export function generateSalesOSQuoteAcceptedEmail(params: {
  userName: string;
  quoteName: string;
  quoteNumber: string;
  quoteAmount: string;
  acceptedBy: string;
  acceptedDate: string;
  quoteUrl: string;
}): string {
  const { userName, quoteName, quoteNumber, quoteAmount, acceptedBy, acceptedDate, quoteUrl } = params;

  const content = `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0 0 24px 0;">
      <tr>
        <td align="center">
          <div style="width: 64px; height: 64px; background-color: ${SALESOS_BRAND.colors.successLight}; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px;">
            <span style="font-size: 32px;">✓</span>
          </div>
        </td>
      </tr>
    </table>

    <h1 style="margin: 0 0 8px 0; font-family: ${SALESOS_BRAND.fonts.heading}; font-size: 28px; font-weight: 600; color: ${SALESOS_BRAND.colors.textDark}; line-height: 1.3; text-align: center;">
      Quote Accepted!
    </h1>
    <p style="margin: 0 0 24px 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 15px; color: ${SALESOS_BRAND.colors.textMuted}; line-height: 1.6; text-align: center;">
      Great news - your quote has been accepted
    </p>

    ${formatDivider()}

    <p style="margin: 0 0 16px 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 15px; color: ${SALESOS_BRAND.colors.textMedium}; line-height: 1.7;">
      ${formatGreeting(userName)}
    </p>
    <p style="margin: 0 0 24px 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 15px; color: ${SALESOS_BRAND.colors.textMedium}; line-height: 1.7;">
      Your quote has been accepted by the customer. Time to convert it to an order!
    </p>

    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0 0 24px 0; background-color: ${SALESOS_BRAND.colors.successLight}; border-radius: 16px; padding: 24px; text-align: center;">
      <tr>
        <td>
          <p style="margin: 0 0 8px 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 14px; color: ${SALESOS_BRAND.colors.success}; font-weight: 600;">
            ${quoteName} (${quoteNumber})
          </p>
          <p style="margin: 0; font-family: ${SALESOS_BRAND.fonts.heading}; font-size: 32px; font-weight: 700; color: ${SALESOS_BRAND.colors.success};">
            ${quoteAmount}
          </p>
        </td>
      </tr>
    </table>

    ${formatInfoBox('Acceptance Details', [
      { label: 'Accepted By', value: acceptedBy },
      { label: 'Accepted Date', value: acceptedDate },
    ])}
  `;

  return generateSalesOSTemplate({
    preheader: `🎉 Quote Accepted: ${quoteName} - ${quoteAmount}`,
    content,
    ctaButton: {
      text: 'Convert to Order',
      url: quoteUrl,
      style: 'gold',
    },
  });
}

/**
 * Quote Expired
 */
export function generateSalesOSQuoteExpiredEmail(params: {
  userName: string;
  quoteName: string;
  quoteNumber: string;
  quoteAmount: string;
  recipientName: string;
  expiredDate: string;
  quoteUrl: string;
}): string {
  const { userName, quoteName, quoteNumber, quoteAmount, recipientName, expiredDate, quoteUrl } = params;

  const content = `
    <h1 style="margin: 0 0 8px 0; font-family: ${SALESOS_BRAND.fonts.heading}; font-size: 28px; font-weight: 600; color: ${SALESOS_BRAND.colors.textDark}; line-height: 1.3;">
      Quote Expired
    </h1>
    <p style="margin: 0 0 24px 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 15px; color: ${SALESOS_BRAND.colors.textMuted}; line-height: 1.6;">
      A quote has passed its validity date
    </p>

    ${formatDivider()}

    <p style="margin: 0 0 16px 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 15px; color: ${SALESOS_BRAND.colors.textMedium}; line-height: 1.7;">
      ${formatGreeting(userName)}
    </p>
    <p style="margin: 0 0 24px 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 15px; color: ${SALESOS_BRAND.colors.textMedium}; line-height: 1.7;">
      The following quote has expired without being accepted:
    </p>

    ${formatInfoBox('Expired Quote', [
      { label: 'Quote', value: `${quoteName} (${quoteNumber})` },
      { label: 'Amount', value: quoteAmount },
      { label: 'Customer', value: recipientName },
      { label: 'Expired On', value: expiredDate },
    ])}

    <p style="margin: 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 15px; color: ${SALESOS_BRAND.colors.textMedium}; line-height: 1.7;">
      Consider following up with the customer or creating a new quote with updated terms.
    </p>
  `;

  return generateSalesOSTemplate({
    preheader: `Quote expired: ${quoteName}`,
    content,
    ctaButton: {
      text: 'Create New Quote',
      url: quoteUrl,
      style: 'primary',
    },
  });
}

/**
 * Order Confirmation
 */
export function generateSalesOSOrderConfirmationEmail(params: {
  userName: string;
  orderNumber: string;
  orderTotal: string;
  customerName: string;
  customerEmail: string;
  orderDate: string;
  items: { name: string; quantity: number; price: string }[];
  orderUrl: string;
}): string {
  const { userName, orderNumber, orderTotal, customerName, customerEmail, orderDate, items, orderUrl } = params;

  const itemsHtml = items.map(item => `
    <tr>
      <td style="padding: 10px 0; border-bottom: 1px solid ${SALESOS_BRAND.colors.borderLight};">
        <span style="font-family: ${SALESOS_BRAND.fonts.body}; font-size: 14px; color: ${SALESOS_BRAND.colors.textDark};">${item.name}</span>
        <span style="font-family: ${SALESOS_BRAND.fonts.body}; font-size: 13px; color: ${SALESOS_BRAND.colors.textMuted}; display: block;">Qty: ${item.quantity}</span>
      </td>
      <td style="padding: 10px 0; border-bottom: 1px solid ${SALESOS_BRAND.colors.borderLight}; text-align: right;">
        <span style="font-family: ${SALESOS_BRAND.fonts.body}; font-size: 14px; font-weight: 500; color: ${SALESOS_BRAND.colors.textDark};">${item.price}</span>
      </td>
    </tr>
  `).join('');

  const content = `
    <h1 style="margin: 0 0 8px 0; font-family: ${SALESOS_BRAND.fonts.heading}; font-size: 28px; font-weight: 600; color: ${SALESOS_BRAND.colors.textDark}; line-height: 1.3;">
      Order Confirmed
    </h1>
    <p style="margin: 0 0 24px 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 15px; color: ${SALESOS_BRAND.colors.textMuted}; line-height: 1.6;">
      A new order has been placed
    </p>

    ${formatDivider()}

    <p style="margin: 0 0 16px 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 15px; color: ${SALESOS_BRAND.colors.textMedium}; line-height: 1.7;">
      ${formatGreeting(userName)}
    </p>
    <p style="margin: 0 0 24px 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 15px; color: ${SALESOS_BRAND.colors.textMedium}; line-height: 1.7;">
      Great news! A new order has been confirmed:
    </p>

    ${formatInfoBox('Order Info', [
      { label: 'Order Number', value: orderNumber },
      { label: 'Customer', value: customerName },
      { label: 'Email', value: customerEmail },
      { label: 'Order Date', value: orderDate },
    ])}

    <p style="margin: 24px 0 12px 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: ${SALESOS_BRAND.colors.textMuted};">
      Order Items
    </p>
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0 0 16px 0;">
      ${itemsHtml}
      <tr>
        <td style="padding: 12px 0;">
          <span style="font-family: ${SALESOS_BRAND.fonts.body}; font-size: 14px; font-weight: 600; color: ${SALESOS_BRAND.colors.textDark};">Total</span>
        </td>
        <td style="padding: 12px 0; text-align: right;">
          <span style="font-family: ${SALESOS_BRAND.fonts.body}; font-size: 16px; font-weight: 700; color: ${SALESOS_BRAND.colors.textDark};">${orderTotal}</span>
        </td>
      </tr>
    </table>
  `;

  return generateSalesOSTemplate({
    preheader: `New order: ${orderNumber} - ${orderTotal}`,
    content,
    ctaButton: {
      text: 'View Order',
      url: orderUrl,
      style: 'primary',
    },
  });
}

// ==================== REPORT TEMPLATES ====================

/**
 * Weekly Summary Report
 */
export function generateSalesOSWeeklySummaryEmail(params: {
  userName: string;
  weekOf: string;
  metrics: {
    dealsWon: number;
    dealsWonValue: string;
    newLeads: number;
    meetingsHeld: number;
    tasksCompleted: number;
    conversionRate?: string;
  };
  topDeals?: { name: string; value: string }[];
  dashboardUrl: string;
}): string {
  const { userName, weekOf, metrics, topDeals, dashboardUrl } = params;

  const topDealsHtml = topDeals && topDeals.length > 0 ? `
    <p style="margin: 24px 0 12px 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: ${SALESOS_BRAND.colors.textMuted};">
      Top Deals This Week
    </p>
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
      ${topDeals.map(deal => `
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid ${SALESOS_BRAND.colors.borderLight};">
            <span style="font-family: ${SALESOS_BRAND.fonts.body}; font-size: 14px; color: ${SALESOS_BRAND.colors.textDark};">${deal.name}</span>
          </td>
          <td style="padding: 8px 0; border-bottom: 1px solid ${SALESOS_BRAND.colors.borderLight}; text-align: right;">
            <span style="font-family: ${SALESOS_BRAND.fonts.body}; font-size: 14px; font-weight: 600; color: ${SALESOS_BRAND.colors.success};">${deal.value}</span>
          </td>
        </tr>
      `).join('')}
    </table>
  ` : '';

  const content = `
    <h1 style="margin: 0 0 8px 0; font-family: ${SALESOS_BRAND.fonts.heading}; font-size: 28px; font-weight: 600; color: ${SALESOS_BRAND.colors.textDark}; line-height: 1.3;">
      Your Weekly Summary
    </h1>
    <p style="margin: 0 0 24px 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 15px; color: ${SALESOS_BRAND.colors.textMuted}; line-height: 1.6;">
      Week of ${weekOf}
    </p>

    ${formatDivider()}

    <p style="margin: 0 0 24px 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 15px; color: ${SALESOS_BRAND.colors.textMedium}; line-height: 1.7;">
      ${formatGreeting(userName)} Here's how you performed this week:
    </p>

    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0 0 24px 0;">
      <tr>
        <td width="50%" style="padding: 12px; background-color: ${SALESOS_BRAND.colors.successLight}; border-radius: 12px 0 0 0;">
          <p style="margin: 0 0 4px 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 24px; font-weight: 700; color: ${SALESOS_BRAND.colors.success};">
            ${metrics.dealsWon}
          </p>
          <p style="margin: 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 12px; color: ${SALESOS_BRAND.colors.textMuted};">
            Deals Won
          </p>
        </td>
        <td width="50%" style="padding: 12px; background-color: ${SALESOS_BRAND.colors.goldLight}; border-radius: 0 12px 0 0;">
          <p style="margin: 0 0 4px 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 24px; font-weight: 700; color: ${SALESOS_BRAND.colors.dark};">
            ${metrics.dealsWonValue}
          </p>
          <p style="margin: 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 12px; color: ${SALESOS_BRAND.colors.textMuted};">
            Revenue Won
          </p>
        </td>
      </tr>
      <tr>
        <td width="50%" style="padding: 12px; background-color: ${SALESOS_BRAND.colors.backgroundAlt}; border-radius: 0 0 0 12px;">
          <p style="margin: 0 0 4px 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 24px; font-weight: 700; color: ${SALESOS_BRAND.colors.dark};">
            ${metrics.newLeads}
          </p>
          <p style="margin: 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 12px; color: ${SALESOS_BRAND.colors.textMuted};">
            New Leads
          </p>
        </td>
        <td width="50%" style="padding: 12px; background-color: ${SALESOS_BRAND.colors.backgroundAlt}; border-radius: 0 0 12px 0;">
          <p style="margin: 0 0 4px 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 24px; font-weight: 700; color: ${SALESOS_BRAND.colors.dark};">
            ${metrics.meetingsHeld}
          </p>
          <p style="margin: 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 12px; color: ${SALESOS_BRAND.colors.textMuted};">
            Meetings Held
          </p>
        </td>
      </tr>
    </table>

    ${formatInfoBox('Activity Summary', [
      { label: 'Tasks Completed', value: String(metrics.tasksCompleted) },
      ...(metrics.conversionRate ? [{ label: 'Conversion Rate', value: metrics.conversionRate }] : []),
    ])}

    ${topDealsHtml}
  `;

  return generateSalesOSTemplate({
    preheader: `Weekly summary: ${metrics.dealsWon} deals won, ${metrics.dealsWonValue} in revenue`,
    content,
    ctaButton: {
      text: 'View Full Report',
      url: dashboardUrl,
      style: 'gold',
    },
  });
}

/**
 * Data Export Complete
 */
export function generateSalesOSExportCompleteEmail(params: {
  userName: string;
  exportType: string;
  recordCount: number;
  fileSize: string;
  downloadUrl: string;
  expiresIn?: string;
}): string {
  const { userName, exportType, recordCount, fileSize, downloadUrl, expiresIn = '7 days' } = params;

  const content = `
    <h1 style="margin: 0 0 8px 0; font-family: ${SALESOS_BRAND.fonts.heading}; font-size: 28px; font-weight: 600; color: ${SALESOS_BRAND.colors.textDark}; line-height: 1.3;">
      Export Ready
    </h1>
    <p style="margin: 0 0 24px 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 15px; color: ${SALESOS_BRAND.colors.textMuted}; line-height: 1.6;">
      Your data export is ready to download
    </p>

    ${formatDivider()}

    <p style="margin: 0 0 16px 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 15px; color: ${SALESOS_BRAND.colors.textMedium}; line-height: 1.7;">
      ${formatGreeting(userName)}
    </p>
    <p style="margin: 0 0 24px 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 15px; color: ${SALESOS_BRAND.colors.textMedium}; line-height: 1.7;">
      Your requested data export has been completed and is ready for download.
    </p>

    ${formatInfoBox('Export Details', [
      { label: 'Export Type', value: exportType },
      { label: 'Records', value: recordCount.toLocaleString() },
      { label: 'File Size', value: fileSize },
    ])}

    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0 0 24px 0; background-color: ${SALESOS_BRAND.colors.goldLight}; border-radius: 12px; padding: 16px 20px;">
      <tr>
        <td>
          <p style="margin: 0; font-family: ${SALESOS_BRAND.fonts.body}; font-size: 13px; color: ${SALESOS_BRAND.colors.textMedium};">
            This download link will expire in <strong>${expiresIn}</strong>.
          </p>
        </td>
      </tr>
    </table>
  `;

  return generateSalesOSTemplate({
    preheader: `Your ${exportType} export is ready - ${recordCount.toLocaleString()} records`,
    content,
    ctaButton: {
      text: 'Download Export',
      url: downloadUrl,
      style: 'primary',
    },
  });
}

// ==================== EXPORT ALL ====================

export const SalesOSEmailTemplates = {
  // Core
  generateTemplate: generateSalesOSTemplate,

  // Authentication & Account
  welcome: generateSalesOSWelcomeEmail,
  forgotPassword: generateSalesOSForgotPasswordEmail,
  passwordReset: generateSalesOSPasswordResetEmail,
  magicLink: generateSalesOSMagicLinkEmail,
  loginNotification: generateSalesOSLoginNotificationEmail,
  verification: generateSalesOSVerificationEmail,
  invitation: generateSalesOSInvitationEmail,
  setupComplete: generateSalesOSSetupCompleteEmail,
  trialEnding: generateSalesOSTrialEndingEmail,
  deactivationWarning: generateSalesOSDeactivationWarningEmail,

  // Billing
  subscriptionConfirmed: generateSalesOSSubscriptionConfirmedEmail,
  paymentReceipt: generateSalesOSPaymentReceiptEmail,
  paymentFailed: generateSalesOSPaymentFailedEmail,
  subscriptionCancelled: generateSalesOSSubscriptionCancelledEmail,

  // CRM Notifications
  dealWon: generateSalesOSDealWonEmail,
  dealLost: generateSalesOSDealLostEmail,
  leadAssigned: generateSalesOSLeadAssignedEmail,
  leadConverted: generateSalesOSLeadConvertedEmail,
  taskReminder: generateSalesOSTaskReminderEmail,
  taskOverdue: generateSalesOSTaskOverdueEmail,
  meetingReminder: generateSalesOSMeetingReminderEmail,
  followUpReminder: generateSalesOSFollowUpReminderEmail,
  staleDealAlert: generateSalesOSStaleDealAlertEmail,

  // Quotes & Orders
  quoteSent: generateSalesOSQuoteSentEmail,
  quoteAccepted: generateSalesOSQuoteAcceptedEmail,
  quoteExpired: generateSalesOSQuoteExpiredEmail,
  orderConfirmation: generateSalesOSOrderConfirmationEmail,

  // Reports & Data
  weeklySummary: generateSalesOSWeeklySummaryEmail,
  exportComplete: generateSalesOSExportCompleteEmail,
};

export default SalesOSEmailTemplates;
