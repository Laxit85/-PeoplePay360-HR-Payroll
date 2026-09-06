/**
 * PeoplePay360 : Live Email Delivery & SMTP Diagnostic Tool
 *
 * Usage:
 *   node test-email-send.js                       (tests with ethereal mock or default test)
 *   node test-email-send.js your_email@gmail.com  (sends real email to your Gmail address)
 */
require('dotenv').config();
const { sendTestEmail, getTransporter } = require('./src/services/emailService');

async function main() {
  const targetEmail = process.argv[2] || process.env.TEST_RECIPIENT_EMAIL || 'test.payroll@peoplepay360.internal';

  console.log('====================================================');
  console.log(' PeoplePay360 : Payroll Email System Diagnostic');
  console.log('====================================================\n');

  console.log(`[Config] Target Recipient : ${targetEmail}`);
  console.log(`[Config] SMTP_HOST        : ${process.env.SMTP_HOST || '(not set - using default)'}`);
  console.log(`[Config] SMTP_PORT        : ${process.env.SMTP_PORT || '587'}`);
  console.log(`[Config] SMTP_USER        : ${process.env.SMTP_USER || '(not set - using Ethereal mock)'}`);
  console.log(`[Config] EMAIL_SERVICE    : ${process.env.EMAIL_SERVICE || 'smtp'}\n`);

  try {
    const transporter = await getTransporter();
    process.stdout.write('⏳ Step 1: Testing SMTP Server Handshake... ');
    await transporter.verify();
    console.log('✅ Connection verified successfully!\n');

    console.log(`⏳ Step 2: Generating & Dispatching Sample Itemized Payslip to <${targetEmail}>...`);
    const result = await sendTestEmail(targetEmail);

    if (result.success) {
      console.log('\n====================================================');
      console.log('🎉 EMAIL TRANSMISSION SUCCESSFUL!');
      console.log('====================================================');
      if (result.previewUrl) {
        console.log(`\n🔗 Test Ethereal Web Preview Link:`);
        console.log(`   ${result.previewUrl}\n`);
        console.log('👉 Open the URL above in your browser to view the rendered HTML email & PDF attachment.');
      } else {
        console.log(`\n📬 Live Delivery Dispatched!`);
        console.log(`   Message ID: ${result.messageId}`);
        console.log(`   Please check inbox (and spam folder) for: ${targetEmail}`);
      }
    } else {
      console.error('\n❌ Transmission Failed:');
      console.error(`   ${result.error}`);
    }
  } catch (err) {
    console.error('\n❌ Diagnostic Failure:', err.message);
    if (err.message.includes('Username and Password not accepted') || err.message.includes('BadCredentials')) {
      console.log('\n💡 Tip for Gmail:');
      console.log('   1. Ensure 2-Step Verification is enabled on your Google Account.');
      console.log('   2. Generate an App Password: https://myaccount.google.com/apppasswords');
      console.log('   3. Put the 16-character App Password into SMTP_PASSWORD in backend/.env.');
    }
  }
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
