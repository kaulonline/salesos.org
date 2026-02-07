// Test script: Simulate an unsolicited email to test auto-CRM creation
const http = require('http');

const testEmail = {
    messageId: 'test-unsolicited-' + Date.now() + '@test.com',
    fromEmail: 'sarah.johnson@globaltech.io',
    fromName: 'Sarah Johnson',
    toEmails: ['irisconnectify@gmail.com'],
    subject: 'Interested in your CRM solution for our sales team',
    bodyText: `Hi there,

I'm Sarah Johnson, VP of Sales at GlobalTech Solutions. We're a mid-sized technology company with about 150 employees and we're looking to upgrade our CRM system.

I came across IRIS CRM and I'm quite impressed with the AI capabilities you showcase on your website. We're particularly interested in:

1. Meeting intelligence and transcription features
2. Sales pipeline automation
3. Email tracking and analytics

Our current system is outdated and we need to make a decision within the next 30 days. Our budget is around $50,000 annually.

Could you schedule a demo for our team? I'm available most afternoons next week.

Best regards,
Sarah Johnson
VP of Sales
GlobalTech Solutions
Phone: +1-555-0123
Email: sarah.johnson@globaltech.io
`,
    receivedAt: new Date().toISOString()
};

console.log('Testing Unsolicited Email Auto-CRM Creation');
console.log('============================================');
console.log('From:', testEmail.fromName, '<' + testEmail.fromEmail + '>');
console.log('Subject:', testEmail.subject);
console.log('');

// Get auth token first
const loginData = JSON.stringify({
    email: 'demo@iriseller.com',
    password: 'demo123'
});

const loginReq = http.request({
    hostname: 'localhost',
    port: 4000,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(loginData)
    }
}, (loginRes) => {
    let loginBody = '';
    loginRes.on('data', chunk => loginBody += chunk);
    loginRes.on('end', () => {
        try {
            const loginResult = JSON.parse(loginBody);
            const token = loginResult.accessToken;

            if (!token) {
                console.log('Login failed:', loginBody);
                process.exit(1);
            }

            console.log('✓ Authenticated successfully');
            sendTestEmail(token);
        } catch (e) {
            console.log('Login parse error:', e.message);
            process.exit(1);
        }
    });
});

loginReq.on('error', (e) => {
    console.error('Login error:', e.message);
    process.exit(1);
});
loginReq.write(loginData);
loginReq.end();

function sendTestEmail(token) {
    const emailData = JSON.stringify(testEmail);

    const emailReq = http.request({
        hostname: 'localhost',
        port: 4000,
        path: '/api/email-tracking/inbound',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(emailData),
            'Authorization': 'Bearer ' + token
        }
    }, (emailRes) => {
        let emailBody = '';
        emailRes.on('data', chunk => emailBody += chunk);
        emailRes.on('end', () => {
            console.log('');
            console.log('=== API Response (Status: ' + emailRes.statusCode + ') ===');
            try {
                const result = JSON.parse(emailBody);
                console.log(JSON.stringify(result, null, 2));
            } catch (e) {
                console.log(emailBody);
            }
        });
    });

    emailReq.on('error', (e) => {
        console.error('Request error:', e.message);
        process.exit(1);
    });
    emailReq.write(emailData);
    emailReq.end();
}
