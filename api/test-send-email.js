const { PrismaClient } = require('@prisma/client');
const { createHash, randomBytes } = require('crypto');
const nodemailer = require('nodemailer');
require('dotenv').config();

const prisma = new PrismaClient();

// Tracking utilities
function generateTrackingId(threadId, messageId) {
  const timestamp = Date.now().toString(36);
  const random = randomBytes(4).toString('hex');
  const hash = createHash('sha256').update(`${threadId}:${messageId}:${timestamp}`).digest('hex').substring(0, 8);
  return `iris_trk_${timestamp}_${random}_${hash}`;
}

function generateTrackingPixel(trackingId, baseUrl) {
  const encodedId = Buffer.from(trackingId).toString('base64url');
  const pixelUrl = `${baseUrl}/api/email-tracking/pixel/${encodedId}.gif`;
  return `<img src="${pixelUrl}" width="1" height="1" alt="" style="display:block;width:1px;height:1px;border:0;opacity:0;" />
<div style="display:none!important;visibility:hidden!important;"><!--[IRIS:${trackingId}]--></div>`;
}

function generateThreadMarker(trackingId, threadId) {
  return `<div style="display:none!important;visibility:hidden!important;font-size:0;line-height:0;height:0;opacity:0;overflow:hidden;">[IRIS-THREAD:${trackingId}:${threadId}]</div>`;
}

async function sendTestEmail() {
  const user = await prisma.user.findFirst();
  if (!user) {
    console.error('No user found');
    return;
  }
  console.log('Using user:', user.id, user.email);

  // Create email thread
  const thread = await prisma.emailThread.create({
    data: {
      userId: user.id,
      subject: 'IRIS CRM Test - Email Tracking Demo',
      status: 'AWAITING_RESPONSE',
      totalEmails: 1,
      lastEmailAt: new Date(),
      suggestedActions: [],
    },
  });
  console.log('Created thread:', thread.id);

  // Generate tracking
  const trackingId = generateTrackingId(thread.id, Date.now().toString());
  const messageId = `<${trackingId}.${thread.id}.${Date.now().toString(36)}@iris-crm.com>`;
  const baseUrl = process.env.APP_URL || 'http://localhost:4000';
  
  console.log('Tracking ID:', trackingId);
  console.log('Message ID:', messageId);

  // Build email body with tracking
  const originalBody = `
    <h2>Hello!</h2>
    <p>This is a <b>test email</b> from IRIS CRM to demonstrate our email tracking capabilities.</p>
    <p>Features being tested:</p>
    <ul>
      <li>📧 Open tracking (invisible pixel)</li>
      <li>🔗 Click tracking (<a href="https://google.com">click here to test</a>)</li>
      <li>↩️ Reply tracking (reply to this email)</li>
    </ul>
    <p>Please <b>reply</b> to this email to test the inbound tracking and CRM automation!</p>
    <p>Best regards,<br>IRIS Sales CRM</p>
  `;
  
  const trackedBody = originalBody + generateTrackingPixel(trackingId, baseUrl) + generateThreadMarker(trackingId, thread.id);

  // Create email record
  const emailMessage = await prisma.emailMessage.create({
    data: {
      threadId: thread.id,
      userId: user.id,
      messageId: messageId,
      fromEmail: process.env.GMAIL_USER,
      fromName: 'IRIS Sales CRM',
      toEmails: ['kashmiris@gmail.com'],
      ccEmails: [],
      bccEmails: [],
      subject: 'IRIS CRM Test - Email Tracking Demo',
      bodyHtml: trackedBody,
      bodyText: 'Test email from IRIS CRM. Please reply to test inbound tracking.',
      direction: 'OUTBOUND',
      status: 'QUEUED',
      keyPoints: [],
      actionItemsExtracted: [],
      metadata: { trackingId },
    },
  });
  console.log('Created email record:', emailMessage.id);

  // Send via nodemailer
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

  try {
    const info = await transporter.sendMail({
      from: `"IRIS Sales CRM" <${process.env.GMAIL_USER}>`,
      to: 'kashmiris@gmail.com',
      subject: 'IRIS CRM Test - Email Tracking Demo',
      html: trackedBody,
      messageId: messageId,
    });
    
    console.log('Email sent:', info.messageId);
    
    await prisma.emailMessage.update({
      where: { id: emailMessage.id },
      data: { status: 'SENT', sentAt: new Date() },
    });
    
    console.log('\n✅ SUCCESS! Email sent to kashmiris@gmail.com');
    console.log('📊 Tracking ID:', trackingId);
    console.log('🧵 Thread ID:', thread.id);
    console.log('\nNext steps:');
    console.log('1. Check your inbox for the email');
    console.log('2. Open the email (will trigger open tracking)');
    console.log('3. Click the link (will trigger click tracking)');
    console.log('4. Reply to the email (will be processed by IMAP polling)');
    
  } catch (error) {
    console.error('Failed to send:', error.message);
    await prisma.emailMessage.update({
      where: { id: emailMessage.id },
      data: { status: 'FAILED' },
    });
  }
}

sendTestEmail().catch(console.error).finally(() => prisma.$disconnect());
