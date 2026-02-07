/**
 * IRIS CRM Email Templates
 *
 * Additional email templates for CRM-specific notifications
 * Task reminders, meeting reminders, activity notifications, etc.
 */

import {
  BRAND,
  generatePremiumTemplate,
  generatePremiumText,
  generatePremiumCard,
  generatePremiumButton,
  generatePremiumHeading,
  generatePremiumList,
  generatePremiumDivider,
  generatePremiumAlert,
  generatePremiumStatBox,
  EmailTemplateResult,
  ButtonStyle,
} from './premium-email-templates';

// ==================== TASK TEMPLATES ====================

export interface TaskReminderEmailParams {
  userName: string;
  taskTitle: string;
  taskDescription?: string;
  dueDate: string;
  dueTime?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  relatedTo?: { type: string; name: string };
  taskUrl: string;
}

/**
 * Task Reminder Email Template
 * Sent when a task is due soon
 */
export function generateTaskReminderEmail(params: TaskReminderEmailParams): EmailTemplateResult {
  const { userName, taskTitle, taskDescription, dueDate, dueTime, priority, relatedTo, taskUrl } = params;

  const priorityConfig = {
    low: { icon: '📝', color: BRAND.colors.textMuted, label: 'Low Priority' },
    medium: { icon: '📋', color: BRAND.colors.info, label: 'Medium Priority' },
    high: { icon: '⚡', color: BRAND.colors.warning, label: 'High Priority' },
    urgent: { icon: '🔥', color: BRAND.colors.error, label: 'Urgent' },
  };

  const p = priorityConfig[priority];

  const content = `
    ${generatePremiumText(`Hello ${userName},`, 'lead')}
    ${generatePremiumText(`This is a reminder that you have a task due soon. Don't let it slip through the cracks!`)}
    ${generatePremiumDivider('space')}
    ${generatePremiumCard({
      rows: [
        { icon: '✓', label: 'Task', value: `<strong>${taskTitle}</strong>` },
        { icon: '📅', label: 'Due', value: dueTime ? `${dueDate} at ${dueTime}` : dueDate },
        { icon: p.icon, label: 'Priority', value: `<span style="color: ${p.color}; font-weight: 500;">${p.label}</span>` },
        ...(relatedTo ? [{ icon: '🔗', label: 'Related To', value: `${relatedTo.type}: ${relatedTo.name}` }] : []),
      ],
      variant: priority === 'urgent' || priority === 'high' ? 'gold-accent' : 'default',
    })}
    ${taskDescription ? `
    ${generatePremiumHeading('Description', 'h4')}
    ${generatePremiumText(taskDescription, 'muted')}
    ` : ''}
    ${priority === 'urgent' ? generatePremiumAlert({
      message: 'This task is marked as <strong>urgent</strong>. Please complete it as soon as possible.',
      type: 'warning',
    }) : ''}
  `;

  const html = generatePremiumTemplate({
    preheader: `Task reminder: ${taskTitle} is due ${dueDate}`,
    heroTitle: 'Task Reminder',
    heroSubtitle: taskTitle,
    heroIcon: priority === 'urgent' ? '🔥' : '📋',
    heroGradient: priority === 'urgent' ? 'gold' : 'dark',
    content,
    ctaButton: { text: 'View Task', url: taskUrl, style: 'primary' },
    footerText: 'Stay on top of your tasks with IRIS',
  });

  const text = `Hello ${userName},

This is a reminder that you have a task due soon.

Task: ${taskTitle}
Due: ${dueTime ? `${dueDate} at ${dueTime}` : dueDate}
Priority: ${p.label}
${relatedTo ? `Related To: ${relatedTo.type}: ${relatedTo.name}` : ''}
${taskDescription ? `\nDescription: ${taskDescription}` : ''}

View task: ${taskUrl}

- The IRIS Team`;

  return {
    html,
    text,
    subject: `${p.icon} Task Reminder: ${taskTitle}`,
  };
}

export interface TaskOverdueEmailParams {
  userName: string;
  tasks: Array<{
    title: string;
    dueDate: string;
    priority: string;
    daysOverdue: number;
  }>;
  dashboardUrl: string;
}

/**
 * Task Overdue Email Template
 * Sent when user has overdue tasks
 */
export function generateTaskOverdueEmail(params: TaskOverdueEmailParams): EmailTemplateResult {
  const { userName, tasks, dashboardUrl } = params;

  const tasksList = tasks.map(task =>
    `<strong>${task.title}</strong> - ${task.daysOverdue} day${task.daysOverdue > 1 ? 's' : ''} overdue`
  );

  const content = `
    ${generatePremiumText(`Hello ${userName},`, 'lead')}
    ${generatePremiumText(`You have <strong style="color: ${BRAND.colors.error};">${tasks.length} overdue task${tasks.length > 1 ? 's' : ''}</strong> that need your attention.`)}
    ${generatePremiumAlert({
      message: 'Overdue tasks can impact your productivity and relationships. Please review and update them as soon as possible.',
      type: 'error',
    })}
    ${generatePremiumDivider('space')}
    ${generatePremiumHeading('Overdue Tasks', 'h3')}
    ${generatePremiumList(tasksList, 'bullet')}
    ${generatePremiumDivider('space')}
    ${generatePremiumText('Take a few minutes to review these tasks and update their status or due dates.', 'muted')}
  `;

  const html = generatePremiumTemplate({
    preheader: `You have ${tasks.length} overdue task${tasks.length > 1 ? 's' : ''} that need attention`,
    heroTitle: 'Tasks Overdue',
    heroSubtitle: `${tasks.length} task${tasks.length > 1 ? 's' : ''} need${tasks.length === 1 ? 's' : ''} your attention`,
    heroIcon: '⚠️',
    heroGradient: 'dark',
    content,
    ctaButton: { text: 'Review Tasks', url: dashboardUrl, style: 'primary' },
    footerText: 'Stay organized with IRIS',
  });

  const text = `Hello ${userName},

You have ${tasks.length} overdue task${tasks.length > 1 ? 's' : ''} that need your attention.

Overdue Tasks:
${tasks.map(t => `• ${t.title} - ${t.daysOverdue} day${t.daysOverdue > 1 ? 's' : ''} overdue`).join('\n')}

Review tasks: ${dashboardUrl}

- The IRIS Team`;

  return {
    html,
    text,
    subject: `⚠️ ${tasks.length} Overdue Task${tasks.length > 1 ? 's' : ''} Need Attention`,
  };
}

// ==================== MEETING TEMPLATES ====================

export interface MeetingReminderEmailParams {
  userName: string;
  meetingTitle: string;
  meetingDate: string;
  meetingTime: string;
  duration: string;
  platform: string;
  joinUrl: string;
  attendees?: string[];
  agenda?: string[];
  minutesUntilStart: number;
}

/**
 * Meeting Reminder Email Template
 * Sent before a meeting starts
 */
export function generateMeetingReminderEmail(params: MeetingReminderEmailParams): EmailTemplateResult {
  const {
    userName,
    meetingTitle,
    meetingDate,
    meetingTime,
    duration,
    platform,
    joinUrl,
    attendees = [],
    agenda = [],
    minutesUntilStart,
  } = params;

  const timeLabel = minutesUntilStart <= 5
    ? 'Starting now!'
    : minutesUntilStart <= 15
      ? `In ${minutesUntilStart} minutes`
      : minutesUntilStart <= 60
        ? `In ${minutesUntilStart} minutes`
        : `In ${Math.round(minutesUntilStart / 60)} hour${Math.round(minutesUntilStart / 60) > 1 ? 's' : ''}`;

  const content = `
    ${generatePremiumText(`Hello ${userName},`, 'lead')}
    ${generatePremiumText(`Your meeting <strong>"${meetingTitle}"</strong> is starting <strong style="color: ${BRAND.colors.gold};">${timeLabel.toLowerCase()}</strong>.`)}
    ${generatePremiumDivider('space')}
    ${generatePremiumCard({
      rows: [
        { icon: '📅', label: 'When', value: `${meetingDate} at ${meetingTime}` },
        { icon: '⏱️', label: 'Duration', value: duration },
        { icon: '💻', label: 'Platform', value: platform },
        ...(attendees.length > 0 ? [{ icon: '👥', label: 'Attendees', value: attendees.slice(0, 3).join(', ') + (attendees.length > 3 ? ` +${attendees.length - 3} more` : '') }] : []),
      ],
      variant: 'gold-accent',
    })}
    ${agenda.length > 0 ? `
    ${generatePremiumHeading('Agenda', 'h4')}
    ${generatePremiumList(agenda, 'numbered')}
    ` : ''}
  `;

  const html = generatePremiumTemplate({
    preheader: `Meeting reminder: ${meetingTitle} - ${timeLabel}`,
    heroTitle: timeLabel,
    heroSubtitle: meetingTitle,
    heroIcon: minutesUntilStart <= 5 ? '🔔' : '📅',
    heroGradient: minutesUntilStart <= 15 ? 'gold' : 'dark',
    content,
    ctaButton: { text: 'Join Meeting', url: joinUrl, style: 'emerald' },
    footerText: 'Be prepared, be on time!',
  });

  const text = `Hello ${userName},

Your meeting "${meetingTitle}" is starting ${timeLabel.toLowerCase()}.

Meeting Details:
- When: ${meetingDate} at ${meetingTime}
- Duration: ${duration}
- Platform: ${platform}
${attendees.length > 0 ? `- Attendees: ${attendees.join(', ')}` : ''}
${agenda.length > 0 ? `\nAgenda:\n${agenda.map((a, i) => `${i + 1}. ${a}`).join('\n')}` : ''}

Join meeting: ${joinUrl}

- The IRIS Team`;

  return {
    html,
    text,
    subject: `${minutesUntilStart <= 5 ? '🔔' : '📅'} ${timeLabel}: ${meetingTitle}`,
  };
}

// ==================== MEETING INVITE TEMPLATE ====================

export interface MeetingInviteEmailParams {
  recipientName?: string;
  meetingTitle: string;
  meetingDate: string;
  meetingTime: string;
  duration: string;
  platform: 'ZOOM' | 'TEAMS' | 'GOOGLE_MEET' | string;
  joinUrl: string;
  organizerName: string;
  organizerEmail?: string;
  agenda?: string;
  attendees?: string[];
}

/**
 * Meeting Invite Email Template
 * Sent when scheduling a meeting with a contact
 */
export function generateMeetingInviteEmail(params: MeetingInviteEmailParams): EmailTemplateResult {
  const {
    recipientName,
    meetingTitle,
    meetingDate,
    meetingTime,
    duration,
    platform,
    joinUrl,
    organizerName,
    organizerEmail,
    agenda,
    attendees = [],
  } = params;

  const platformName = platform === 'ZOOM' ? 'Zoom' : platform === 'TEAMS' ? 'Microsoft Teams' : platform === 'GOOGLE_MEET' ? 'Google Meet' : platform;
  const greeting = recipientName ? `Hello ${recipientName},` : 'Hello,';

  const content = `
    ${generatePremiumText(greeting, 'lead')}
    ${generatePremiumText(`You have been invited to a meeting by <strong>${organizerName}</strong>.`)}
    ${generatePremiumDivider('space')}
    ${generatePremiumCard({
      rows: [
        { icon: '📅', label: 'When', value: `${meetingDate} at ${meetingTime}` },
        { icon: '⏱️', label: 'Duration', value: duration },
        { icon: '💻', label: 'Platform', value: platformName },
        ...(attendees.length > 1 ? [{ icon: '👥', label: 'Attendees', value: attendees.slice(0, 3).join(', ') + (attendees.length > 3 ? ` +${attendees.length - 3} more` : '') }] : []),
      ],
      variant: 'gold-accent',
    })}
    ${agenda ? `
    ${generatePremiumHeading('Agenda', 'h4')}
    ${generatePremiumText(agenda)}
    ` : ''}
    ${generatePremiumDivider('space')}
    ${generatePremiumText('Click the button below to join the meeting at the scheduled time.', 'small')}
  `;

  const html = generatePremiumTemplate({
    preheader: `Meeting invitation: ${meetingTitle} - ${meetingDate} at ${meetingTime}`,
    heroTitle: 'Meeting Invitation',
    heroSubtitle: meetingTitle,
    heroIcon: '📅',
    heroGradient: 'emerald',
    content,
    ctaButton: { text: 'Join Meeting', url: joinUrl, style: 'emerald' },
    footerText: organizerEmail ? `Organized by ${organizerName} (${organizerEmail})` : `Organized by ${organizerName}`,
  });

  const text = `${greeting}

You have been invited to a meeting by ${organizerName}.

Meeting Details:
- Title: ${meetingTitle}
- When: ${meetingDate} at ${meetingTime}
- Duration: ${duration}
- Platform: ${platformName}
${attendees.length > 1 ? `- Attendees: ${attendees.join(', ')}` : ''}
${agenda ? `\nAgenda:\n${agenda}` : ''}

Join meeting: ${joinUrl}

- The IRIS Team`;

  return {
    html,
    text,
    subject: `Meeting Invitation: ${meetingTitle} - ${meetingDate}`,
  };
}

// ==================== ACTIVITY TEMPLATES ====================

export interface ActivitySummaryEmailParams {
  userName: string;
  period: 'daily' | 'weekly';
  dateRange: string;
  stats: {
    callsMade: number;
    emailsSent: number;
    meetingsHeld: number;
    tasksCompleted: number;
    dealsUpdated: number;
    notesAdded: number;
  };
  highlights?: string[];
  dashboardUrl: string;
}

/**
 * Activity Summary Email Template
 * Weekly or daily activity summary
 */
export function generateActivitySummaryEmail(params: ActivitySummaryEmailParams): EmailTemplateResult {
  const { userName, period, dateRange, stats, highlights = [], dashboardUrl } = params;

  const periodLabel = period === 'daily' ? 'Daily' : 'Weekly';
  const totalActivities = stats.callsMade + stats.emailsSent + stats.meetingsHeld + stats.tasksCompleted;

  const statsGrid = `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
      <tr>
        <td style="width: 50%; padding: 8px;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: ${BRAND.colors.cream}; border-radius: 10px; padding: 20px; text-align: center;">
            <tr><td style="font-size: 28px; color: ${BRAND.colors.gold}; font-weight: 300;">📞 ${stats.callsMade}</td></tr>
            <tr><td style="font-size: 11px; color: ${BRAND.colors.textMuted}; text-transform: uppercase; letter-spacing: 1px; padding-top: 6px;">Calls Made</td></tr>
          </table>
        </td>
        <td style="width: 50%; padding: 8px;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: ${BRAND.colors.cream}; border-radius: 10px; padding: 20px; text-align: center;">
            <tr><td style="font-size: 28px; color: ${BRAND.colors.gold}; font-weight: 300;">📧 ${stats.emailsSent}</td></tr>
            <tr><td style="font-size: 11px; color: ${BRAND.colors.textMuted}; text-transform: uppercase; letter-spacing: 1px; padding-top: 6px;">Emails Sent</td></tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="width: 50%; padding: 8px;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: ${BRAND.colors.cream}; border-radius: 10px; padding: 20px; text-align: center;">
            <tr><td style="font-size: 28px; color: ${BRAND.colors.gold}; font-weight: 300;">📅 ${stats.meetingsHeld}</td></tr>
            <tr><td style="font-size: 11px; color: ${BRAND.colors.textMuted}; text-transform: uppercase; letter-spacing: 1px; padding-top: 6px;">Meetings</td></tr>
          </table>
        </td>
        <td style="width: 50%; padding: 8px;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: ${BRAND.colors.cream}; border-radius: 10px; padding: 20px; text-align: center;">
            <tr><td style="font-size: 28px; color: ${BRAND.colors.gold}; font-weight: 300;">✓ ${stats.tasksCompleted}</td></tr>
            <tr><td style="font-size: 11px; color: ${BRAND.colors.textMuted}; text-transform: uppercase; letter-spacing: 1px; padding-top: 6px;">Tasks Done</td></tr>
          </table>
        </td>
      </tr>
    </table>`;

  const content = `
    ${generatePremiumText(`Hello ${userName},`, 'lead')}
    ${generatePremiumText(`Here's your ${period} activity summary for <strong>${dateRange}</strong>.`)}
    ${generatePremiumStatBox({
      value: totalActivities.toString(),
      label: 'Total Activities',
      icon: '📊',
      variant: 'gold',
    })}
    ${generatePremiumDivider('space')}
    ${statsGrid}
    ${generatePremiumDivider('space')}
    ${generatePremiumCard({
      rows: [
        { icon: '💼', label: 'Deals Updated', value: stats.dealsUpdated.toString() },
        { icon: '📝', label: 'Notes Added', value: stats.notesAdded.toString() },
      ],
      variant: 'default',
    })}
    ${highlights.length > 0 ? `
    ${generatePremiumHeading('Highlights', 'h4')}
    ${generatePremiumList(highlights, 'check')}
    ` : ''}
  `;

  const html = generatePremiumTemplate({
    preheader: `Your ${period} activity summary: ${totalActivities} activities`,
    heroTitle: `${periodLabel} Activity Summary`,
    heroSubtitle: dateRange,
    heroIcon: '📈',
    heroGradient: 'emerald',
    content,
    ctaButton: { text: 'View Full Report', url: dashboardUrl, style: 'primary' },
    footerText: 'Keep up the great work!',
  });

  const text = `Hello ${userName},

Here's your ${period} activity summary for ${dateRange}.

Total Activities: ${totalActivities}

Activity Breakdown:
- Calls Made: ${stats.callsMade}
- Emails Sent: ${stats.emailsSent}
- Meetings Held: ${stats.meetingsHeld}
- Tasks Completed: ${stats.tasksCompleted}
- Deals Updated: ${stats.dealsUpdated}
- Notes Added: ${stats.notesAdded}

${highlights.length > 0 ? `Highlights:\n${highlights.map(h => `• ${h}`).join('\n')}` : ''}

View full report: ${dashboardUrl}

- The IRIS Team`;

  return {
    html,
    text,
    subject: `📈 Your ${periodLabel} Activity Summary - ${totalActivities} Activities`,
  };
}

// ==================== NOTIFICATION TEMPLATES ====================

export interface DealStageChangeEmailParams {
  userName: string;
  dealName: string;
  accountName: string;
  previousStage: string;
  newStage: string;
  dealValue: string;
  probability: number;
  changedBy: string;
  dealUrl: string;
  notes?: string;
}

/**
 * Deal Stage Change Email Template
 * Sent when a deal moves to a new stage
 */
export function generateDealStageChangeEmail(params: DealStageChangeEmailParams): EmailTemplateResult {
  const {
    userName,
    dealName,
    accountName,
    previousStage,
    newStage,
    dealValue,
    probability,
    changedBy,
    dealUrl,
    notes,
  } = params;

  const isProgressing = ['Closed Won', 'Negotiation', 'Proposal'].some(s => newStage.includes(s));
  const isWon = newStage.toLowerCase().includes('won');
  const isLost = newStage.toLowerCase().includes('lost');

  const content = `
    ${generatePremiumText(`Hello ${userName},`, 'lead')}
    ${generatePremiumText(`The deal <strong>"${dealName}"</strong> has moved to a new stage.`)}
    ${generatePremiumDivider('space')}
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 16px 0;">
      <tr>
        <td style="text-align: center; padding: 20px; background-color: ${BRAND.colors.cream}; border-radius: 12px;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr>
              <td style="text-align: center; width: 40%;">
                <div style="font-size: 12px; color: ${BRAND.colors.textMuted}; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">Previous</div>
                <div style="font-size: 16px; color: ${BRAND.colors.textSecondary}; font-weight: 400;">${previousStage}</div>
              </td>
              <td style="text-align: center; width: 20%;">
                <span style="font-size: 24px; color: ${BRAND.colors.gold};">→</span>
              </td>
              <td style="text-align: center; width: 40%;">
                <div style="font-size: 12px; color: ${BRAND.colors.textMuted}; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">New Stage</div>
                <div style="font-size: 16px; color: ${isWon ? BRAND.colors.success : isLost ? BRAND.colors.error : BRAND.colors.gold}; font-weight: 500;">${newStage}</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    ${generatePremiumDivider('space')}
    ${generatePremiumCard({
      rows: [
        { icon: '💼', label: 'Deal', value: `<strong>${dealName}</strong>` },
        { icon: '🏢', label: 'Account', value: accountName },
        { icon: '💰', label: 'Value', value: dealValue },
        { icon: '📊', label: 'Probability', value: `${probability}%` },
        { icon: '👤', label: 'Updated By', value: changedBy },
      ],
      variant: isWon ? 'success' : 'default',
    })}
    ${notes ? `
    ${generatePremiumHeading('Notes', 'h4')}
    ${generatePremiumText(notes, 'muted')}
    ` : ''}
  `;

  const html = generatePremiumTemplate({
    preheader: `Deal update: ${dealName} moved to ${newStage}`,
    heroTitle: isWon ? 'Deal Won!' : isLost ? 'Deal Update' : 'Deal Progressing',
    heroSubtitle: `${dealName} • ${newStage}`,
    heroIcon: isWon ? '🎉' : isLost ? '📋' : '📈',
    heroGradient: isWon ? 'celebration' : isLost ? 'dark' : 'emerald',
    content,
    ctaButton: { text: 'View Deal', url: dealUrl, style: isWon ? 'emerald' : 'primary' },
    footerText: isWon ? 'Congratulations!' : 'Keep pushing forward!',
  });

  const text = `Hello ${userName},

The deal "${dealName}" has moved to a new stage.

Stage Change: ${previousStage} → ${newStage}

Deal Details:
- Deal: ${dealName}
- Account: ${accountName}
- Value: ${dealValue}
- Probability: ${probability}%
- Updated By: ${changedBy}
${notes ? `\nNotes: ${notes}` : ''}

View deal: ${dealUrl}

- The IRIS Team`;

  return {
    html,
    text,
    subject: `${isWon ? '🎉' : '📈'} Deal Update: ${dealName} → ${newStage}`,
  };
}

export interface AccountVerificationEmailParams {
  userName: string;
  userEmail: string;
  verificationCode: string;
  verificationUrl: string;
  expiresInMinutes: number;
}

/**
 * Account Verification Email Template
 * Sent to verify user's email address
 */
export function generateAccountVerificationEmail(params: AccountVerificationEmailParams): EmailTemplateResult {
  const { userName, userEmail, verificationCode, verificationUrl, expiresInMinutes } = params;

  const content = `
    ${generatePremiumText(`Hello ${userName},`, 'lead')}
    ${generatePremiumText(`Please verify your email address to complete your IRIS account setup. This helps us keep your account secure.`)}
    ${generatePremiumDivider('space')}
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 16px 0;">
      <tr>
        <td style="padding-bottom: 8px;">
          <span style="font-size: 11px; font-weight: 600; color: ${BRAND.colors.textMuted}; letter-spacing: 1.5px; text-transform: uppercase;">Your Verification Code</span>
        </td>
      </tr>
      <tr>
        <td style="background-color: ${BRAND.colors.dark}; border-radius: 8px; padding: 20px 24px; text-align: center;">
          <code style="font-family: 'SF Mono', Monaco, 'Courier New', monospace; font-size: 32px; font-weight: 500; color: ${BRAND.colors.gold}; letter-spacing: 8px;">${verificationCode}</code>
        </td>
      </tr>
    </table>
    ${generatePremiumText(`Or click the button below to verify automatically.`, 'muted')}
    ${generatePremiumDivider('space')}
    ${generatePremiumCard({
      rows: [
        { icon: '📧', label: 'Email', value: userEmail },
        { icon: '⏰', label: 'Expires In', value: `${expiresInMinutes} minutes` },
      ],
      variant: 'default',
    })}
    ${generatePremiumAlert({
      message: 'If you did not create an account with IRIS, you can safely ignore this email.',
      type: 'info',
    })}
  `;

  const html = generatePremiumTemplate({
    preheader: `Verify your IRIS account - code: ${verificationCode}`,
    heroTitle: 'Verify Your Email',
    heroSubtitle: 'One quick step to secure your account',
    heroIcon: '✉️',
    heroGradient: 'emerald',
    content,
    ctaButton: { text: 'Verify Email', url: verificationUrl, style: 'primary' },
    footerText: 'This verification link expires in ' + expiresInMinutes + ' minutes.',
  });

  const text = `Hello ${userName},

Please verify your email address to complete your IRIS account setup.

Your Verification Code: ${verificationCode}

Or verify here: ${verificationUrl}

Email: ${userEmail}
Expires In: ${expiresInMinutes} minutes

If you did not create an account with IRIS, you can safely ignore this email.

- The IRIS Team`;

  return {
    html,
    text,
    subject: `Verify your IRIS email - Code: ${verificationCode}`,
  };
}

// ==================== ADMIN NOTIFICATION TEMPLATES ====================

export interface NewUserSignupEmailParams {
  adminName: string;
  newUserName: string;
  newUserEmail: string;
  signupDate: string;
  signupSource?: string;
  adminDashboardUrl: string;
}

/**
 * New User Signup Admin Notification
 * Sent to admins when a new user signs up
 */
export function generateNewUserSignupEmail(params: NewUserSignupEmailParams): EmailTemplateResult {
  const { adminName, newUserName, newUserEmail, signupDate, signupSource, adminDashboardUrl } = params;

  const content = `
    ${generatePremiumText(`Hello ${adminName},`, 'lead')}
    ${generatePremiumText(`A new user has signed up for IRIS Sales CRM.`)}
    ${generatePremiumDivider('space')}
    ${generatePremiumCard({
      rows: [
        { icon: '👤', label: 'Name', value: `<strong>${newUserName}</strong>` },
        { icon: '📧', label: 'Email', value: newUserEmail },
        { icon: '📅', label: 'Signed Up', value: signupDate },
        ...(signupSource ? [{ icon: '📍', label: 'Source', value: signupSource }] : []),
      ],
      variant: 'gold-accent',
    })}
    ${generatePremiumDivider('space')}
    ${generatePremiumText('You can review and manage this user from the admin dashboard.', 'muted')}
  `;

  const html = generatePremiumTemplate({
    preheader: `New user signup: ${newUserName} (${newUserEmail})`,
    heroTitle: 'New User Signup',
    heroSubtitle: newUserName,
    heroIcon: '👋',
    heroGradient: 'dark',
    content,
    ctaButton: { text: 'View in Admin', url: adminDashboardUrl, style: 'primary' },
    footerText: 'Admin notification',
  });

  const text = `Hello ${adminName},

A new user has signed up for IRIS Sales CRM.

New User Details:
- Name: ${newUserName}
- Email: ${newUserEmail}
- Signed Up: ${signupDate}
${signupSource ? `- Source: ${signupSource}` : ''}

View in admin dashboard: ${adminDashboardUrl}

- The IRIS Team`;

  return {
    html,
    text,
    subject: `👋 New User Signup: ${newUserName}`,
  };
}
