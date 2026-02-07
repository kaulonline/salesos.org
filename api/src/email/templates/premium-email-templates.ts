/**
 * IRIS Email Templates
 *
 * Design Philosophy: Minimalist Luxury Typography
 * Inspired by: Apple, Aesop, Chanel email communications
 *
 * Principles:
 * - NO illustrations, NO icons, NO emojis
 * - Typography creates hierarchy and elegance
 * - Generous whitespace lets content breathe
 * - Subtle color accents (emerald links, gold CTA)
 * - Georgia serif for warmth, system sans for clarity
 */

// ==================== BRAND SYSTEM ====================

export const BRAND = {
  colors: {
    // Primary palette
    gold: '#c9a882',
    goldHover: '#b8976f',
    emerald: '#006039',

    // Neutrals
    white: '#ffffff',
    background: '#f7f7f7',
    backgroundAlt: '#fafafa',

    // Typography
    textDark: '#1a1a1a',
    textMedium: '#3d3d3d',
    textMuted: '#6b7280',
    textLight: '#9ca3af',

    // Utility
    border: '#e8e8e8',
    borderLight: '#f0f0f0',
    success: '#10b981',
    successLight: '#d1fae5',
    warning: '#f59e0b',
    warningLight: '#fef3c7',
    error: '#ef4444',
    errorLight: '#fee2e2',
    info: '#3b82f6',
    infoLight: '#dbeafe',

    // Legacy compatibility
    textPrimary: '#1a1a1a',
    textSecondary: '#3d3d3d',
    dark: '#1a1a1a',
    obsidian: '#1a1a1a',
    ivory: '#fafafa',
    cream: '#f7f7f7',
    pearl: '#ffffff',
    goldLight: '#d4b896',
    goldDark: '#b8976f',
    emeraldLight: '#00784a',
    emeraldDark: '#004d2e',
    jade: '#00A86B',
  },
  fonts: {
    // Georgia for elegant headings, system sans for body
    heading: "Georgia, 'Times New Roman', Times, serif",
    body: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
    // Legacy
    primary: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
    display: "Georgia, 'Times New Roman', Times, serif",
  },
  logo: {
    text: 'IRIS',
    tagline: 'AI-First Sales Intelligence',
  },
};

// IRIS Logo - Emerald green square with sparkle icon (matching landing page)
// Design: Emerald green square (#006039) with white sparkle icon
// Uses Unicode sparkle character for maximum email client compatibility
export const IRIS_LOGO = `
<table role="presentation" cellspacing="0" cellpadding="0" border="0">
  <tr>
    <td style="width: 40px; height: 40px; background-color: ${BRAND.colors.emerald}; border-radius: 10px; text-align: center; vertical-align: middle; box-shadow: 0 4px 12px rgba(0, 96, 57, 0.25);">
      <span style="font-size: 20px; color: #ffffff; line-height: 40px;">&#10022;</span>
    </td>
  </tr>
</table>`;

// ==================== CORE TEMPLATE ====================

export type ButtonStyle = 'primary' | 'secondary' | 'emerald' | 'outline' | 'ghost';
export type HeroGradient = 'gold' | 'emerald' | 'dark' | 'success' | 'celebration';

/**
 * Generate a typography-focused email template
 * Clean, elegant, no visual clutter
 */
export function generatePremiumTemplate(options: {
  preheader?: string;
  content: string;
  footerText?: string;
  ctaButton?: { text: string; url: string; style?: ButtonStyle };
  // Legacy params (ignored)
  heroTitle?: string;
  heroSubtitle?: string;
  heroIcon?: string;
  illustration?: string;
  heroGradient?: HeroGradient;
  showSocialLinks?: boolean;
}): string {
  const {
    preheader = '',
    content,
    footerText,
    ctaButton,
  } = options;

  const ctaHtml = ctaButton ? `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 32px 0 0 0;">
      <tr>
        <td align="center">
          <a href="${ctaButton.url}" target="_blank" style="display: inline-block; background-color: ${BRAND.colors.emerald}; color: #ffffff; font-family: ${BRAND.fonts.body}; font-size: 14px; font-weight: 600; text-decoration: none; padding: 14px 36px; border-radius: 6px; letter-spacing: 0.3px; box-shadow: 0 4px 12px rgba(0, 96, 57, 0.25);">
            ${ctaButton.text}
          </a>
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
  <title>IRIS</title>
  ${preheader ? `<div style="display:none;font-size:1px;color:#f7f7f7;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">${preheader}</div>` : ''}
  <style>
    @media only screen and (max-width: 600px) {
      .email-container { width: 100% !important; margin: 0 !important; }
      .content-cell { padding: 40px 28px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: ${BRAND.colors.background}; font-family: ${BRAND.fonts.body}; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;">

  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: ${BRAND.colors.background};">
    <tr>
      <td align="center" style="padding: 48px 20px;">

        <!-- Email Card -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="520" class="email-container" style="background-color: ${BRAND.colors.white}; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">

          <!-- Logo -->
          <tr>
            <td style="padding: 40px 48px 0 48px;">
              ${IRIS_LOGO}
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td class="content-cell" style="padding: 40px 48px 48px 48px;">
              ${content}
              ${ctaHtml}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 0 48px 40px 48px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="border-top: 1px solid ${BRAND.colors.border}; padding-top: 32px;">
                    ${footerText ? `<p style="margin: 0 0 12px 0; font-family: ${BRAND.fonts.body}; font-size: 13px; color: ${BRAND.colors.textMuted}; line-height: 1.6;">${footerText}</p>` : ''}
                    <p style="margin: 0; font-family: ${BRAND.fonts.body}; font-size: 12px; color: ${BRAND.colors.textLight}; line-height: 1.5;">
                      Questions? <a href="mailto:rosa@iriseller.com" style="color: ${BRAND.colors.emerald}; text-decoration: none;">rosa@iriseller.com</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>`;
}

// ==================== TYPOGRAPHY UTILITIES ====================

export function generateGreeting(name: string): string {
  return `<p style="margin: 0 0 24px 0; font-family: ${BRAND.fonts.heading}; font-size: 24px; font-weight: 400; color: ${BRAND.colors.textDark}; line-height: 1.3;">Hi ${name},</p>`;
}

export function generateBodyText(text: string, options?: { muted?: boolean; small?: boolean }): string {
  const color = options?.muted ? BRAND.colors.textMuted : BRAND.colors.textMedium;
  const size = options?.small ? '14px' : '16px';
  return `<p style="margin: 0 0 20px 0; font-family: ${BRAND.fonts.body}; font-size: ${size}; font-weight: 400; color: ${color}; line-height: 1.65;">${text}</p>`;
}

export function generateEmphasis(text: string): string {
  return `<p style="margin: 0 0 20px 0; font-family: ${BRAND.fonts.heading}; font-size: 18px; font-style: italic; font-weight: 400; color: ${BRAND.colors.textDark}; line-height: 1.5;">${text}</p>`;
}

export function generatePremiumHeading(text: string, level: 'h1' | 'h2' | 'h3' | 'h4' = 'h2', options?: { centered?: boolean; gold?: boolean }): string {
  const sizes = { h1: '28px', h2: '22px', h3: '18px', h4: '16px' };
  const color = options?.gold ? BRAND.colors.gold : BRAND.colors.textDark;
  const align = options?.centered ? 'text-align: center;' : '';
  return `<${level} style="margin: 0 0 20px 0; font-family: ${BRAND.fonts.heading}; font-size: ${sizes[level]}; font-weight: 400; color: ${color}; line-height: 1.3; ${align}">${text}</${level}>`;
}

export function generateLineDivider(): string {
  return `<div style="height: 1px; background-color: ${BRAND.colors.border}; margin: 28px 0;"></div>`;
}

export function generateGoldDivider(width: string = '40px'): string {
  return `<div style="width: ${width}; height: 2px; background-color: ${BRAND.colors.gold}; margin: 28px 0;"></div>`;
}

export function generateSpacer(height: number = 24): string {
  return `<div style="height: ${height}px;"></div>`;
}

// ==================== DETAIL COMPONENTS ====================

export function generateDetailRow(options: { label: string; value: string; icon?: string; muted?: boolean }): string {
  const { label, value, muted = false } = options;
  // Icons are ignored in this minimal design
  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 16px;">
      <tr>
        <td style="vertical-align: top;">
          <span style="display: block; font-family: ${BRAND.fonts.body}; font-size: 11px; font-weight: 500; letter-spacing: 0.8px; text-transform: uppercase; color: ${BRAND.colors.textMuted}; margin-bottom: 4px;">${label}</span>
          <span style="display: block; font-family: ${BRAND.fonts.body}; font-size: 15px; color: ${muted ? BRAND.colors.textMuted : BRAND.colors.textDark}; line-height: 1.4;">${value}</span>
        </td>
      </tr>
    </table>`;
}

type CardVariant = 'default' | 'elevated' | 'gold-accent' | 'dark' | 'success' | 'warning' | 'error';

export function generatePremiumCard(options: {
  content?: string;
  rows?: Array<{ icon?: string; label: string; value: string }>;
  variant?: CardVariant;
  padding?: string;
}): string {
  const { content, rows, variant = 'default', padding = '24px' } = options;

  let cardContent = content || '';
  if (rows && rows.length > 0) {
    cardContent = rows.map(row => generateDetailRow(row)).join('');
  }

  const variants: Record<CardVariant, { bg: string; border?: string; shadow?: string }> = {
    default: { bg: BRAND.colors.backgroundAlt, border: `1px solid ${BRAND.colors.border}` },
    elevated: { bg: BRAND.colors.white, shadow: '0 2px 8px rgba(0,0,0,0.06)' },
    'gold-accent': { bg: BRAND.colors.backgroundAlt, border: `1px solid ${BRAND.colors.gold}` },
    dark: { bg: BRAND.colors.textDark },
    success: { bg: BRAND.colors.successLight, border: `1px solid ${BRAND.colors.success}` },
    warning: { bg: '#FEF3CD', border: '1px solid #F59E0B' },
    error: { bg: '#FEE2E2', border: '1px solid #EF4444' },
  };
  const v = variants[variant] || variants.default;

  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 24px 0;">
      <tr>
        <td style="background-color: ${v.bg}; border-radius: 8px;${v.border ? ` border: ${v.border};` : ''}${v.shadow ? ` box-shadow: ${v.shadow};` : ''} padding: ${padding};">
          ${cardContent}
        </td>
      </tr>
    </table>`;
}

export function generateStatDisplay(options: { value: string; label: string; icon?: string; variant?: 'gold' | 'emerald' | 'default' }): string {
  const { value, label, variant = 'gold' } = options;
  // Icons are ignored
  const colors = {
    gold: BRAND.colors.gold,
    emerald: BRAND.colors.emerald,
    default: BRAND.colors.textMuted,
  };

  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 24px 0;">
      <tr>
        <td style="text-align: center; padding: 24px;">
          <div style="font-family: ${BRAND.fonts.heading}; font-size: 42px; font-weight: 400; color: ${colors[variant]}; line-height: 1; margin-bottom: 8px;">${value}</div>
          <div style="font-family: ${BRAND.fonts.body}; font-size: 12px; font-weight: 500; color: ${BRAND.colors.textMuted}; letter-spacing: 1px; text-transform: uppercase;">${label}</div>
        </td>
      </tr>
    </table>`;
}

export function generateInfoGrid(items: Array<{ icon?: string; label: string; value: string }>): string {
  let html = '<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">';
  for (let i = 0; i < items.length; i += 2) {
    html += '<tr>';
    html += `<td style="width: 50%; padding: 8px 8px 8px 0; vertical-align: top;">${generateDetailRow(items[i])}</td>`;
    if (items[i + 1]) {
      html += `<td style="width: 50%; padding: 8px 0 8px 8px; vertical-align: top;">${generateDetailRow(items[i + 1])}</td>`;
    }
    html += '</tr>';
  }
  html += '</table>';
  return html;
}

export function generatePremiumList(items: string[], variant: 'bullet' | 'numbered' | 'check' = 'bullet'): string {
  let html = '<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">';
  items.forEach((item, index) => {
    const marker = variant === 'numbered' ? `${index + 1}.` : variant === 'check' ? '—' : '—';
    html += `
      <tr>
        <td style="width: 20px; vertical-align: top; padding: 6px 0; font-family: ${BRAND.fonts.body}; color: ${BRAND.colors.gold}; font-weight: 400;">${marker}</td>
        <td style="vertical-align: top; padding: 6px 0; font-family: ${BRAND.fonts.body}; color: ${BRAND.colors.textMedium}; font-size: 15px; line-height: 1.5;">${item}</td>
      </tr>`;
  });
  html += '</table>';
  return html;
}

export function generatePremiumCode(code: string, label?: string): string {
  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 24px 0;">
      ${label ? `<tr><td style="padding-bottom: 12px;"><span style="font-family: ${BRAND.fonts.body}; font-size: 12px; font-weight: 500; color: ${BRAND.colors.textMuted}; letter-spacing: 0.8px; text-transform: uppercase;">${label}</span></td></tr>` : ''}
      <tr>
        <td style="background-color: ${BRAND.colors.textDark}; border-radius: 8px; padding: 20px 28px; text-align: center;">
          <code style="font-family: 'SF Mono', Monaco, 'Courier New', monospace; font-size: 28px; font-weight: 500; color: ${BRAND.colors.gold}; letter-spacing: 6px;">${code}</code>
        </td>
      </tr>
    </table>`;
}

export function generatePremiumAlert(options: { message: string; type: 'info' | 'warning' | 'success' | 'error'; icon?: string }): string {
  const { message, type } = options;
  // Icons are ignored
  const types = {
    info: { bg: BRAND.colors.infoLight, border: '#93c5fd', text: '#1e40af' },
    warning: { bg: BRAND.colors.warningLight, border: '#fcd34d', text: '#92400e' },
    success: { bg: BRAND.colors.successLight, border: '#a7f3d0', text: '#065f46' },
    error: { bg: BRAND.colors.errorLight, border: '#fca5a5', text: '#991b1b' },
  };
  const t = types[type];

  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 24px 0;">
      <tr>
        <td style="background-color: ${t.bg}; border-radius: 6px; border-left: 3px solid ${t.border}; padding: 16px 20px;">
          <p style="margin: 0; font-family: ${BRAND.fonts.body}; color: ${t.text}; font-size: 14px; line-height: 1.5;">${message}</p>
        </td>
      </tr>
    </table>`;
}

export function generatePremiumButton(text: string, url: string, style: ButtonStyle = 'primary'): string {
  const styles: Record<ButtonStyle, { bg: string; text: string; border?: string; shadow?: string }> = {
    primary: { bg: BRAND.colors.emerald, text: '#ffffff', shadow: '0 4px 12px rgba(0, 96, 57, 0.25)' },
    secondary: { bg: BRAND.colors.textDark, text: '#ffffff' },
    emerald: { bg: BRAND.colors.emerald, text: '#ffffff', shadow: '0 4px 12px rgba(0, 96, 57, 0.25)' },
    outline: { bg: 'transparent', text: BRAND.colors.textDark, border: `1px solid ${BRAND.colors.border}` },
    ghost: { bg: 'transparent', text: BRAND.colors.emerald, border: `1px solid ${BRAND.colors.emerald}` },
  };
  const s = styles[style];

  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
      <tr>
        <td align="center">
          <a href="${url}" target="_blank" style="display: inline-block; background-color: ${s.bg}; color: ${s.text}; font-family: ${BRAND.fonts.body}; font-size: 14px; font-weight: 600; text-decoration: none; padding: 14px 36px; border-radius: 6px;${s.border ? ` border: ${s.border};` : ''}${s.shadow ? ` box-shadow: ${s.shadow};` : ''} letter-spacing: 0.3px;">
            ${text}
          </a>
        </td>
      </tr>
    </table>`;
}

// ==================== EMAIL TEMPLATES ====================

export interface WelcomeEmailParams {
  userName: string;
  userEmail: string;
  loginUrl: string;
  supportEmail?: string;
}

export function generateWelcomeEmail(params: WelcomeEmailParams): { html: string; text: string; subject: string } {
  const { userName, userEmail, loginUrl } = params;
  const firstName = userName.split(' ')[0];

  const content = `
    ${generateGreeting(firstName)}
    ${generateBodyText('Welcome to IRIS. Your AI-powered sales assistant is ready to help you work smarter and close more deals.')}
    ${generateBodyText('Get started by exploring your dashboard and connecting your first data source.', { muted: true })}
  `;

  const html = generatePremiumTemplate({
    preheader: 'Welcome to IRIS — Your AI sales assistant awaits',
    content,
    ctaButton: { text: 'Get Started', url: loginUrl },
    footerText: `You're receiving this because you signed up with ${userEmail}.`,
  });

  const text = `Hi ${firstName},

Welcome to IRIS. Your AI-powered sales assistant is ready to help you work smarter and close more deals.

Get started: ${loginUrl}

— The IRIS Team`;

  return { html, text, subject: 'Welcome to IRIS' };
}

export interface PasswordResetEmailParams {
  userName: string;
  resetUrl: string;
  expiresInHours?: number;
  ipAddress?: string;
  userAgent?: string;
}

export function generatePasswordResetEmail(params: PasswordResetEmailParams): { html: string; text: string; subject: string } {
  const { userName, resetUrl, expiresInHours = 24 } = params;
  const firstName = userName.split(' ')[0];

  const content = `
    ${generateGreeting(firstName)}
    ${generateBodyText('We received a request to reset your password. Click the button below to create a new one.')}
    ${generateBodyText(`This link will expire in ${expiresInHours} hours.`, { muted: true, small: true })}
  `;

  const html = generatePremiumTemplate({
    preheader: 'Reset your IRIS password',
    content,
    ctaButton: { text: 'Reset Password', url: resetUrl },
    footerText: "If you didn't request this, you can safely ignore this email.",
  });

  const text = `Hi ${firstName},

We received a request to reset your password. Click the link below to create a new one.

Reset password: ${resetUrl}

This link expires in ${expiresInHours} hours.

— The IRIS Team`;

  return { html, text, subject: 'Reset your password' };
}

export interface ForgotPasswordEmailParams {
  userName: string;
  resetUrl: string;
  resetCode?: string;
  expiresInHours?: number;
  expiresInMinutes?: number;
}

export function generateForgotPasswordEmail(params: ForgotPasswordEmailParams): { html: string; text: string; subject: string } {
  const { userName, resetUrl } = params;
  const firstName = userName.split(' ')[0];

  const content = `
    ${generateGreeting(firstName)}
    ${generateBodyText("No worries — it happens. Click below to set a new password.")}
  `;

  const html = generatePremiumTemplate({
    preheader: 'Reset your IRIS password',
    content,
    ctaButton: { text: 'Reset Password', url: resetUrl },
    footerText: "If you didn't request this, you can ignore this email.",
  });

  const text = `Hi ${firstName},

No worries — it happens. Click below to set a new password.

Reset: ${resetUrl}

— The IRIS Team`;

  return { html, text, subject: 'Reset your password' };
}

export interface MagicLinkEmailParams {
  userName: string;
  magicLinkUrl: string;
  expiresInMinutes?: number;
  ipAddress?: string;
  userAgent?: string;
}

export function generateMagicLinkEmail(params: MagicLinkEmailParams): { html: string; text: string; subject: string } {
  const { userName, magicLinkUrl, expiresInMinutes = 15 } = params;
  const firstName = userName.split(' ')[0];

  const content = `
    ${generateGreeting(firstName)}
    ${generateBodyText('Click below to sign in to your account. No password needed.')}
    ${generateBodyText(`This link expires in ${expiresInMinutes} minutes.`, { muted: true, small: true })}
  `;

  const html = generatePremiumTemplate({
    preheader: 'Sign in to IRIS',
    content,
    ctaButton: { text: 'Sign In', url: magicLinkUrl },
    footerText: "If you didn't request this, you can ignore this email.",
  });

  const text = `Hi ${firstName},

Click below to sign in to your account.

Sign in: ${magicLinkUrl}

This link expires in ${expiresInMinutes} minutes.

— The IRIS Team`;

  return { html, text, subject: 'Sign in to IRIS' };
}

export interface LoginNotificationEmailParams {
  userName: string;
  loginTime: string;
  ipAddress?: string;
  location?: string;
  device?: string;
  browser?: string;
  securityUrl: string;
  wasYou?: boolean;
}

export function generateLoginNotificationEmail(params: LoginNotificationEmailParams): { html: string; text: string; subject: string } {
  const { userName, loginTime, location, device, browser, securityUrl } = params;
  const firstName = userName.split(' ')[0];
  const locationDisplay = location || 'Unknown location';

  const content = `
    ${generateGreeting(firstName)}
    ${generateBodyText('We noticed a new sign-in to your account.')}
    ${generatePremiumCard({
      rows: [
        { label: 'Time', value: loginTime },
        { label: 'Location', value: locationDisplay },
        { label: 'Device', value: device || 'Unknown' },
        { label: 'Browser', value: browser || 'Unknown' },
      ],
      variant: 'default',
    })}
    ${generateBodyText("If this wasn't you, please secure your account immediately.", { muted: true, small: true })}
  `;

  const html = generatePremiumTemplate({
    preheader: `New sign-in from ${locationDisplay}`,
    content,
    ctaButton: { text: 'Review Activity', url: securityUrl, style: 'outline' },
    footerText: 'If this was you, no action is needed.',
  });

  const text = `Hi ${firstName},

We noticed a new sign-in to your account.

Time: ${loginTime}
Location: ${locationDisplay}
Device: ${device || 'Unknown'}
Browser: ${browser || 'Unknown'}

If this wasn't you, secure your account: ${securityUrl}

— The IRIS Team`;

  return { html, text, subject: `New sign-in from ${locationDisplay}` };
}

export interface DealWonEmailParams {
  userName: string;
  dealName: string;
  dealValue: string;
  accountName: string;
  closedDate: string;
  dashboardUrl: string;
}

export function generateDealWonEmail(params: DealWonEmailParams): { html: string; text: string; subject: string } {
  const { userName, dealName, dealValue, accountName, closedDate, dashboardUrl } = params;
  const firstName = userName.split(' ')[0];

  const content = `
    ${generatePremiumHeading(`Congratulations, ${firstName}.`, 'h2')}
    ${generateBodyText('You just closed a deal.')}
    ${generateStatDisplay({ value: dealValue, label: 'Deal Value', variant: 'gold' })}
    ${generatePremiumCard({
      rows: [
        { label: 'Deal', value: dealName },
        { label: 'Account', value: accountName },
        { label: 'Closed', value: closedDate },
      ],
      variant: 'gold-accent',
    })}
  `;

  const html = generatePremiumTemplate({
    preheader: `Deal won: ${dealName} — ${dealValue}`,
    content,
    ctaButton: { text: 'View Dashboard', url: dashboardUrl },
    footerText: 'Keep up the great work.',
  });

  const text = `Congratulations, ${firstName}.

You just closed ${dealName} for ${dealValue}.

Account: ${accountName}
Closed: ${closedDate}

View dashboard: ${dashboardUrl}

— The IRIS Team`;

  return { html, text, subject: `Deal Won: ${dealName}` };
}

export interface NewLeadAssignedEmailParams {
  userName: string;
  leadName: string;
  company?: string;
  email?: string;
  phone?: string;
  source?: string;
  score?: number;
  leadUrl: string;
}

export function generateNewLeadAssignedEmail(params: NewLeadAssignedEmailParams): { html: string; text: string; subject: string } {
  const { userName, leadName, company, email, phone, source, score, leadUrl } = params;
  const firstName = userName.split(' ')[0];

  const rows: Array<{ label: string; value: string }> = [
    { label: 'Name', value: leadName },
  ];
  if (company) rows.push({ label: 'Company', value: company });
  if (email) rows.push({ label: 'Email', value: email });
  if (phone) rows.push({ label: 'Phone', value: phone });
  if (source) rows.push({ label: 'Source', value: source });

  const content = `
    ${generateGreeting(firstName)}
    ${generateBodyText('A new lead has been assigned to you.')}
    ${score !== undefined ? generateStatDisplay({ value: `${score}`, label: 'Lead Score', variant: score >= 70 ? 'emerald' : 'gold' }) : ''}
    ${generatePremiumCard({ rows, variant: 'default' })}
  `;

  const html = generatePremiumTemplate({
    preheader: `New lead: ${leadName}${company ? ` from ${company}` : ''}`,
    content,
    ctaButton: { text: 'View Lead', url: leadUrl, style: 'emerald' },
    footerText: 'Timing is everything.',
  });

  const text = `Hi ${firstName},

A new lead has been assigned to you.

Name: ${leadName}
${company ? `Company: ${company}` : ''}
${email ? `Email: ${email}` : ''}
${phone ? `Phone: ${phone}` : ''}

View lead: ${leadUrl}

— The IRIS Team`;

  return { html, text, subject: `New Lead: ${leadName}` };
}

export interface DailyDigestEmailParams {
  userName: string;
  date: string;
  stats: {
    newLeads: number;
    activeTasks: number;
    meetingsToday: number;
    pendingFollowUps: number;
    dealsInProgress: number;
    pipelineValue: string;
  };
  topPriorityItems: Array<{ type: 'meeting' | 'task' | 'follow-up' | 'deal'; title: string; subtitle?: string; time?: string }>;
  insights: string[];
  dashboardUrl: string;
}

export function generateDailyDigestEmail(params: DailyDigestEmailParams): { html: string; text: string; subject: string } {
  const { userName, date, stats, topPriorityItems, insights, dashboardUrl } = params;
  const firstName = userName.split(' ')[0];

  const content = `
    ${generatePremiumHeading(`Good morning, ${firstName}.`, 'h2')}
    ${generateBodyText(`Here's your overview for ${date}.`, { muted: true })}

    <!-- Stats Row -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 32px 0;">
      <tr>
        <td style="text-align: center; padding: 20px; background-color: ${BRAND.colors.backgroundAlt}; border-radius: 8px 0 0 8px; border-right: 1px solid ${BRAND.colors.border};">
          <div style="font-family: ${BRAND.fonts.heading}; font-size: 32px; font-weight: 400; color: ${BRAND.colors.gold}; line-height: 1;">${stats.newLeads}</div>
          <div style="font-family: ${BRAND.fonts.body}; font-size: 11px; font-weight: 500; color: ${BRAND.colors.textMuted}; letter-spacing: 1px; text-transform: uppercase; margin-top: 8px;">Leads</div>
        </td>
        <td style="text-align: center; padding: 20px; background-color: ${BRAND.colors.backgroundAlt}; border-right: 1px solid ${BRAND.colors.border};">
          <div style="font-family: ${BRAND.fonts.heading}; font-size: 32px; font-weight: 400; color: ${BRAND.colors.emerald}; line-height: 1;">${stats.meetingsToday}</div>
          <div style="font-family: ${BRAND.fonts.body}; font-size: 11px; font-weight: 500; color: ${BRAND.colors.textMuted}; letter-spacing: 1px; text-transform: uppercase; margin-top: 8px;">Meetings</div>
        </td>
        <td style="text-align: center; padding: 20px; background-color: ${BRAND.colors.backgroundAlt}; border-radius: 0 8px 8px 0;">
          <div style="font-family: ${BRAND.fonts.heading}; font-size: 32px; font-weight: 400; color: ${BRAND.colors.gold}; line-height: 1;">${stats.activeTasks}</div>
          <div style="font-family: ${BRAND.fonts.body}; font-size: 11px; font-weight: 500; color: ${BRAND.colors.textMuted}; letter-spacing: 1px; text-transform: uppercase; margin-top: 8px;">Tasks</div>
        </td>
      </tr>
    </table>

    ${topPriorityItems.length > 0 ? `
    <p style="margin: 0 0 16px 0; font-family: ${BRAND.fonts.body}; font-size: 12px; font-weight: 500; color: ${BRAND.colors.textMuted}; letter-spacing: 1px; text-transform: uppercase;">Today's Priorities</p>
    ${topPriorityItems.slice(0, 4).map(item => `
      <div style="padding: 14px 0; border-bottom: 1px solid ${BRAND.colors.borderLight};">
        <span style="font-family: ${BRAND.fonts.body}; font-size: 15px; color: ${BRAND.colors.textDark};">${item.title}</span>
        ${item.time ? `<span style="float: right; font-family: ${BRAND.fonts.body}; font-size: 13px; color: ${BRAND.colors.gold};">${item.time}</span>` : ''}
      </div>
    `).join('')}
    ` : ''}

    ${insights.length > 0 ? `
    <p style="margin: 32px 0 16px 0; font-family: ${BRAND.fonts.body}; font-size: 12px; font-weight: 500; color: ${BRAND.colors.textMuted}; letter-spacing: 1px; text-transform: uppercase;">AI Insights</p>
    ${generatePremiumList(insights, 'bullet')}
    ` : ''}
  `;

  const html = generatePremiumTemplate({
    preheader: `${stats.newLeads} leads, ${stats.meetingsToday} meetings today`,
    content,
    ctaButton: { text: 'Open Dashboard', url: dashboardUrl },
    footerText: 'Have a productive day.',
  });

  const text = `Good morning, ${firstName}.

Here's your overview for ${date}:
- ${stats.newLeads} new leads
- ${stats.meetingsToday} meetings
- ${stats.activeTasks} tasks

Open dashboard: ${dashboardUrl}

— The IRIS Team`;

  return { html, text, subject: `Daily Digest: ${stats.newLeads} leads, ${stats.meetingsToday} meetings` };
}

// ==================== COMPATIBILITY EXPORTS ====================

export interface EmailTemplateResult {
  html: string;
  text: string;
  subject: string;
}

// Legacy type - now ignored
export type IllustrationType = 'magicLink' | 'security' | 'welcome' | 'location' | 'trophy' | 'person' | 'chart' | 'lock';

export function generatePremiumText(text: string, options?: string | { centered?: boolean; muted?: boolean }): string {
  let muted = false;
  let centered = false;

  if (typeof options === 'string') {
    if (options === 'muted') muted = true;
    if (options === 'centered') centered = true;
  } else if (options) {
    centered = options.centered || false;
    muted = options.muted || false;
  }

  const color = muted ? BRAND.colors.textMuted : BRAND.colors.textMedium;
  return `<p style="margin: 0 0 20px 0; font-family: ${BRAND.fonts.body}; font-size: 16px; font-weight: 400; line-height: 1.65; color: ${color}; ${centered ? 'text-align: center;' : ''}">${text}</p>`;
}

export function generatePremiumDivider(options?: string | { type?: 'line' | 'space' | 'gold' }): string {
  let type: 'line' | 'space' | 'gold' = 'line';

  if (typeof options === 'string') {
    if (options === 'space') type = 'space';
    else if (options === 'gold') type = 'gold';
  } else if (options?.type) {
    type = options.type;
  }

  if (type === 'space') {
    return `<div style="height: 24px;"></div>`;
  }
  if (type === 'gold') {
    return generateGoldDivider('40px');
  }
  return generateLineDivider();
}

export function generatePremiumStatBox(options: { value: string; label: string; icon?: string; variant?: 'gold' | 'emerald' | 'success' | 'default' }): string {
  const mappedVariant = options.variant === 'success' ? 'emerald' : options.variant;
  return generateStatDisplay({ ...options, variant: mappedVariant as 'gold' | 'emerald' | 'default' });
}

// ==================== SUPPORT TICKET EMAILS ====================

export interface TicketVerificationEmailParams {
  userName: string;
  userEmail: string;
  subject: string;
  verifyUrl: string;
  expiresInHours?: number;
}

export function generateTicketVerificationEmail(params: TicketVerificationEmailParams): EmailTemplateResult {
  const { userName, subject, verifyUrl, expiresInHours = 24 } = params;
  const firstName = userName?.split(' ')[0] || 'there';

  const content = `
    ${generateGreeting(firstName)}
    ${generateBodyText('Thank you for contacting IRIS Support. Please verify your email to complete your request.')}
    ${generatePremiumCard({
      rows: [
        { label: 'Subject', value: subject },
      ],
      variant: 'default',
    })}
    ${generateBodyText(`This link expires in ${expiresInHours} hours.`, { muted: true, small: true })}
  `;

  const html = generatePremiumTemplate({
    preheader: 'Verify your email to submit your support request',
    content,
    ctaButton: { text: 'Verify & Submit', url: verifyUrl },
    footerText: "If you didn't request this, you can safely ignore this email.",
  });

  const text = `Hi ${firstName},

Thank you for contacting IRIS Support. Please verify your email to complete your request.

Subject: ${subject}

Verify your email: ${verifyUrl}

This link expires in ${expiresInHours} hours.

— The IRIS Team`;

  return { html, text, subject: 'Verify your email — IRIS Support' };
}

export interface TicketCreatedEmailParams {
  userName: string;
  caseId: string;
  subject: string;
  category: string;
  statusUrl: string;
}

export function generateTicketCreatedEmail(params: TicketCreatedEmailParams): EmailTemplateResult {
  const { userName, caseId, subject, category, statusUrl } = params;
  const firstName = userName?.split(' ')[0] || 'there';

  const content = `
    ${generateGreeting(firstName)}
    ${generateBodyText('Your support request has been received. Our team will review it and get back to you soon.')}
    ${generateStatDisplay({ value: caseId, label: 'Case ID', variant: 'gold' })}
    ${generatePremiumCard({
      rows: [
        { label: 'Subject', value: subject },
        { label: 'Category', value: category.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase()) },
      ],
      variant: 'gold-accent',
    })}
    ${generateBodyText('Save your Case ID to check the status of your request at any time.', { muted: true, small: true })}
  `;

  const html = generatePremiumTemplate({
    preheader: `Support request received — Case ${caseId}`,
    content,
    ctaButton: { text: 'Check Status', url: statusUrl },
    footerText: "We'll email you when there's an update.",
  });

  const text = `Hi ${firstName},

Your support request has been received.

Case ID: ${caseId}
Subject: ${subject}
Category: ${category.replace(/_/g, ' ')}

Check status: ${statusUrl}

— The IRIS Team`;

  return { html, text, subject: `[${caseId}] Support request received` };
}

export interface TicketResponseEmailParams {
  userName: string;
  caseId: string;
  subject: string;
  responseContent: string;
  statusUrl: string;
}

export function generateTicketResponseEmail(params: TicketResponseEmailParams): EmailTemplateResult {
  const { userName, caseId, subject, responseContent, statusUrl } = params;
  const firstName = userName?.split(' ')[0] || 'there';

  const content = `
    ${generateGreeting(firstName)}
    ${generateBodyText(`There's an update on your support request <strong>${caseId}</strong>.`)}
    ${generatePremiumCard({
      content: `<p style="margin: 0; font-family: ${BRAND.fonts.body}; font-size: 15px; color: ${BRAND.colors.textMedium}; line-height: 1.65; white-space: pre-wrap;">${responseContent}</p>`,
      variant: 'default',
    })}
  `;

  const html = generatePremiumTemplate({
    preheader: `Update on your support request ${caseId}`,
    content,
    ctaButton: { text: 'View Full Ticket', url: statusUrl },
    footerText: `Re: ${subject}`,
  });

  const text = `Hi ${firstName},

There's an update on your support request ${caseId}.

---
${responseContent}
---

View full ticket: ${statusUrl}

— The IRIS Team`;

  return { html, text, subject: `[${caseId}] Update on your request` };
}

export interface TicketStatusChangeEmailParams {
  userName: string;
  caseId: string;
  subject: string;
  newStatus: string;
  statusUrl: string;
}

export function generateTicketStatusChangeEmail(params: TicketStatusChangeEmailParams): EmailTemplateResult {
  const { userName, caseId, subject, newStatus, statusUrl } = params;
  const firstName = userName?.split(' ')[0] || 'there';
  const statusDisplay = newStatus.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
  const isResolved = newStatus === 'RESOLVED' || newStatus === 'CLOSED';

  const content = `
    ${generateGreeting(firstName)}
    ${generateBodyText(`Your support request <strong>${caseId}</strong> has been updated.`)}
    ${generatePremiumCard({
      rows: [
        { label: 'Status', value: statusDisplay },
        { label: 'Subject', value: subject },
      ],
      variant: isResolved ? 'success' : 'default',
    })}
    ${isResolved ? generateBodyText('Thank you for contacting IRIS Support. If you have any other questions, feel free to open a new request.', { muted: true }) : ''}
  `;

  const html = generatePremiumTemplate({
    preheader: `Your ticket ${caseId} is now ${statusDisplay}`,
    content,
    ctaButton: { text: 'View Ticket', url: statusUrl },
    footerText: isResolved ? 'We hope we were able to help.' : "We'll continue working on your request.",
  });

  const text = `Hi ${firstName},

Your support request ${caseId} has been updated.

Status: ${statusDisplay}
Subject: ${subject}

View ticket: ${statusUrl}

— The IRIS Team`;

  return { html, text, subject: `[${caseId}] Status: ${statusDisplay}` };
}

export interface CriticalTicketAlertEmailParams {
  caseId: string;
  subject: string;
  category: string;
  description: string;
  submitterEmail: string;
  submitterName?: string;
  adminUrl: string;
}

export function generateCriticalTicketAlertEmail(params: CriticalTicketAlertEmailParams): EmailTemplateResult {
  const { caseId, subject, category, description, submitterEmail, submitterName, adminUrl } = params;
  const categoryDisplay = category.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());

  const content = `
    ${generatePremiumHeading('Urgent Support Ticket', 'h2')}
    ${generatePremiumAlert({ message: `A ${category === 'SECURITY' ? 'security-related' : 'critical'} support ticket requires immediate attention.`, type: 'warning' })}
    ${generatePremiumCard({
      rows: [
        { label: 'Case ID', value: caseId },
        { label: 'Category', value: categoryDisplay },
        { label: 'Subject', value: subject },
        { label: 'From', value: submitterName ? `${submitterName} (${submitterEmail})` : submitterEmail },
      ],
      variant: 'gold-accent',
    })}
    ${generateBodyText(description.length > 300 ? description.substring(0, 300) + '...' : description, { muted: true })}
  `;

  const html = generatePremiumTemplate({
    preheader: `URGENT: ${categoryDisplay} ticket ${caseId}`,
    content,
    ctaButton: { text: 'Review Ticket', url: adminUrl, style: 'emerald' },
    footerText: 'This is an automated alert for critical support tickets.',
  });

  const text = `URGENT SUPPORT TICKET

Case ID: ${caseId}
Category: ${categoryDisplay}
Subject: ${subject}
From: ${submitterName ? `${submitterName} (${submitterEmail})` : submitterEmail}

${description}

Review ticket: ${adminUrl}

— IRIS Support System`;

  return { html, text, subject: `URGENT: [${caseId}] ${categoryDisplay} ticket requires attention` };
}

// ==================== CSAT FEEDBACK EMAIL ====================

export interface CSATFeedbackEmailParams {
  userName: string;
  caseId: string;
  subject: string;
  personalizedMessage: string;  // LLM-generated personalized content
  feedbackUrl: string;
  agentName?: string;
}

export function generateCSATFeedbackEmail(params: CSATFeedbackEmailParams): EmailTemplateResult {
  const { userName, caseId, subject, personalizedMessage, feedbackUrl, agentName } = params;
  const firstName = userName?.split(' ')[0] || 'there';

  // Star rating HTML - clickable stars
  const starRatingHtml = `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 32px 0;">
      <tr>
        <td align="center">
          <p style="margin: 0 0 16px 0; font-family: ${BRAND.fonts.body}; font-size: 14px; color: ${BRAND.colors.textMuted};">How was your experience?</p>
          <table role="presentation" cellspacing="0" cellpadding="0" border="0">
            <tr>
              ${[1, 2, 3, 4, 5].map(rating => `
                <td style="padding: 0 8px;">
                  <a href="${feedbackUrl}&rating=${rating}" target="_blank" style="display: inline-block; width: 48px; height: 48px; line-height: 48px; text-align: center; background-color: ${BRAND.colors.backgroundAlt}; border: 1px solid ${BRAND.colors.border}; border-radius: 50%; text-decoration: none; font-size: 24px; transition: all 0.2s ease;">
                    ★
                  </a>
                </td>
              `).join('')}
            </tr>
            <tr>
              <td colspan="2" style="padding-top: 12px; text-align: left;">
                <span style="font-family: ${BRAND.fonts.body}; font-size: 11px; color: ${BRAND.colors.textLight};">Poor</span>
              </td>
              <td></td>
              <td colspan="2" style="padding-top: 12px; text-align: right;">
                <span style="font-family: ${BRAND.fonts.body}; font-size: 11px; color: ${BRAND.colors.textLight};">Excellent</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>`;

  const content = `
    ${generateGreeting(firstName)}
    ${generateBodyText(personalizedMessage)}
    ${generatePremiumCard({
      rows: [
        { label: 'Case', value: caseId },
        { label: 'Subject', value: subject },
        ...(agentName ? [{ label: 'Helped by', value: agentName }] : []),
      ],
      variant: 'gold-accent',
    })}
    ${starRatingHtml}
    ${generateBodyText('Click a star to rate your experience, or use the button below to share detailed feedback.', { muted: true, small: true })}
  `;

  const html = generatePremiumTemplate({
    preheader: `How did we do? Share your feedback on case ${caseId}`,
    content,
    ctaButton: { text: 'Share Detailed Feedback', url: feedbackUrl },
    footerText: 'Your feedback helps us serve you better.',
  });

  const text = `Hi ${firstName},

${personalizedMessage}

Case: ${caseId}
Subject: ${subject}
${agentName ? `Helped by: ${agentName}` : ''}

How was your experience? (1-5 stars)
Share your feedback: ${feedbackUrl}

— The IRIS Team`;

  return { html, text, subject: `How did we do? [${caseId}]` };
}

// ==================== WAITLIST EMAILS ====================

export interface WaitlistConfirmationEmailParams {
  email: string;
  name?: string;
  company?: string;
}

export function generateWaitlistConfirmationEmail(params: WaitlistConfirmationEmailParams): EmailTemplateResult {
  const { name, company } = params;
  const firstName = name?.split(' ')[0] || 'there';

  const content = `
    ${generateGreeting(firstName)}
    ${generateBodyText("You're on the list. We're building something special — an AI-first CRM that eliminates manual data entry and helps sales teams close more deals.")}
    ${generateGoldDivider()}
    ${generateEmphasis("Early access launching Q1 2026.")}
    ${generateBodyText("We'll reach out personally when it's your turn. In the meantime, we're heads-down building the future of sales intelligence.", { muted: true })}
    ${company ? generatePremiumCard({
      rows: [
        { label: 'Company', value: company },
      ],
      variant: 'default',
    }) : ''}
  `;

  const html = generatePremiumTemplate({
    preheader: "You're on the IRIS waitlist — early access coming soon",
    content,
    footerText: 'Thank you for your interest in IRIS.',
  });

  const text = `Hi ${firstName},

You're on the list.

We're building something special — an AI-first CRM that eliminates manual data entry and helps sales teams close more deals.

Early access launching Q1 2026. We'll reach out personally when it's your turn.

Thank you for your interest in IRIS.

— The IRIS Team`;

  return { html, text, subject: "You're on the IRIS waitlist" };
}

// ==================== SLA NOTIFICATION EMAILS ====================

export interface TicketProgressEmailParams {
  userName: string;
  caseId: string;
  subject: string;
  status: string;
  timeRemaining: string;
  escalationLevel: number;
  statusUrl: string;
}

export function generateTicketProgressEmail(params: TicketProgressEmailParams): EmailTemplateResult {
  const { userName, caseId, subject, status, timeRemaining, escalationLevel, statusUrl } = params;
  const firstName = userName.split(' ')[0];

  const statusMessage = escalationLevel >= 2
    ? "We're prioritizing your request and working to resolve it as quickly as possible."
    : "Your request is being actively worked on by our team.";

  const urgencyNote = escalationLevel >= 2
    ? generatePremiumAlert({
        message: 'Your ticket has been escalated for priority attention.',
        type: 'warning',
        icon: '⚡',
      })
    : '';

  const content = `
    ${generateGreeting(firstName)}
    ${generateBodyText(`We wanted to keep you updated on your support request.`)}
    ${urgencyNote}
    ${generatePremiumCard({
      rows: [
        { label: 'Case ID', value: caseId },
        { label: 'Subject', value: subject },
        { label: 'Status', value: status.replace(/_/g, ' ') },
        { label: 'Time Remaining', value: timeRemaining },
      ],
      variant: 'default',
    })}
    ${generateBodyText(statusMessage)}
    ${generateGoldDivider()}
    ${generatePremiumButton('Check Status', statusUrl, 'secondary')}
  `;

  const html = generatePremiumTemplate({
    preheader: `Update on your support request [${caseId}]`,
    content,
    footerText: 'Thank you for your patience.',
  });

  const text = `Hi ${firstName},

We wanted to keep you updated on your support request.

Case ID: ${caseId}
Subject: ${subject}
Status: ${status.replace(/_/g, ' ')}
Time Remaining: ${timeRemaining}

${statusMessage}

Check status: ${statusUrl}

— The IRIS Support Team`;

  return { html, text, subject: `Update on your request [${caseId}]` };
}

export interface SlaWarningEmailParams {
  caseId: string;
  subject: string;
  customerEmail: string;
  priority: string;
  alertType: 'WARNING' | 'CRITICAL' | 'BREACHED';
  timeRemaining: string;
  percentElapsed: number;
  ticketUrl: string;
}

export function generateSlaWarningEmail(params: SlaWarningEmailParams): EmailTemplateResult {
  const { caseId, subject, customerEmail, priority, alertType, timeRemaining, percentElapsed, ticketUrl } = params;

  const alertConfig = {
    WARNING: {
      icon: '⚠️',
      color: '#F59E0B',
      message: 'SLA at 50% - Action needed soon',
      type: 'warning' as const,
    },
    CRITICAL: {
      icon: '🚨',
      color: '#EF4444',
      message: 'SLA at 75% - Immediate action required',
      type: 'error' as const,
    },
    BREACHED: {
      icon: '❌',
      color: '#DC2626',
      message: 'SLA BREACHED - Escalation required',
      type: 'error' as const,
    },
  };

  const config = alertConfig[alertType];

  const content = `
    ${generatePremiumHeading(`${config.icon} SLA ${alertType}`, 'h2', { centered: true })}
    ${generatePremiumAlert({
      message: config.message,
      type: config.type,
      icon: config.icon,
    })}
    ${generatePremiumCard({
      rows: [
        { label: 'Case ID', value: caseId },
        { label: 'Subject', value: subject },
        { label: 'Customer', value: customerEmail },
        { label: 'Priority', value: priority },
        { label: 'SLA Elapsed', value: `${percentElapsed}%` },
        { label: 'Time Remaining', value: timeRemaining },
      ],
      variant: alertType === 'BREACHED' ? 'error' : 'warning',
    })}
    ${generateGoldDivider()}
    ${generatePremiumButton('View Ticket', ticketUrl, 'primary')}
    ${generateBodyText(
      alertType === 'BREACHED'
        ? 'This ticket has breached its SLA. Please respond to the customer immediately and document the resolution plan.'
        : 'Please prioritize this ticket to ensure SLA compliance.',
      { muted: true }
    )}
  `;

  const html = generatePremiumTemplate({
    preheader: `${config.icon} SLA ${alertType}: ${caseId} - ${timeRemaining} remaining`,
    content,
    footerText: 'IRIS Support SLA Monitoring System',
  });

  const text = `SLA ${alertType} - ${caseId}

${config.message}

Case ID: ${caseId}
Subject: ${subject}
Customer: ${customerEmail}
Priority: ${priority}
SLA Elapsed: ${percentElapsed}%
Time Remaining: ${timeRemaining}

View ticket: ${ticketUrl}

${alertType === 'BREACHED'
  ? 'This ticket has breached its SLA. Please respond to the customer immediately.'
  : 'Please prioritize this ticket to ensure SLA compliance.'}

— IRIS Support SLA Monitoring`;

  return { html, text, subject: `🚨 SLA ${alertType}: [${caseId}] ${subject}` };
}

export interface SlaBreachEmailParams {
  userName: string;
  caseId: string;
  subject: string;
  breachType: 'response' | 'resolution';
  statusUrl: string;
}

export function generateSlaBreachEmail(params: SlaBreachEmailParams): EmailTemplateResult {
  const { userName, caseId, subject, breachType, statusUrl } = params;
  const firstName = userName.split(' ')[0];

  const content = `
    ${generateGreeting(firstName)}
    ${generateBodyText(`We sincerely apologize for the delay in ${breachType === 'response' ? 'responding to' : 'resolving'} your support request.`)}
    ${generatePremiumCard({
      rows: [
        { label: 'Case ID', value: caseId },
        { label: 'Subject', value: subject },
      ],
      variant: 'default',
    })}
    ${generatePremiumAlert({
      message: 'Your ticket has been escalated to our senior support team for immediate attention.',
      type: 'info',
      icon: '⚡',
    })}
    ${generateBodyText("We understand how important timely support is, and we're taking steps to ensure this doesn't happen again. Your satisfaction is our top priority.")}
    ${generateGoldDivider()}
    ${generatePremiumButton('Check Status', statusUrl, 'secondary')}
    ${generateBodyText("As a token of our apology, we'll be following up personally to ensure your issue is fully resolved.", { muted: true })}
  `;

  const html = generatePremiumTemplate({
    preheader: `We apologize for the delay - [${caseId}] has been escalated`,
    content,
    footerText: 'Thank you for your patience and understanding.',
  });

  const text = `Hi ${firstName},

We sincerely apologize for the delay in ${breachType === 'response' ? 'responding to' : 'resolving'} your support request.

Case ID: ${caseId}
Subject: ${subject}

Your ticket has been escalated to our senior support team for immediate attention.

We understand how important timely support is, and we're taking steps to ensure this doesn't happen again.

Check status: ${statusUrl}

Thank you for your patience and understanding.

— The IRIS Support Team`;

  return { html, text, subject: `We apologize for the delay [${caseId}]` };
}
