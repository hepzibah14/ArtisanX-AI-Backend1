/**
 * Email Service - Production Ready
 * Handles sending emails with proper error handling and timeout
 */

const nodemailer = require('nodemailer');

let transporter = null;

/**
 * Initialize email transporter with environment variables
 * @returns {nodemailer.Transporter} Nodemailer transporter
 */
const initializeTransporter = () => {
  // If transporter already exists, return it
  if (transporter) {
    return transporter;
  }

  const smtpEmail = process.env.SMTP_EMAIL || process.env.EMAIL_USER;
  const smtpPassword = process.env.SMTP_PASSWORD || process.env.EMAIL_APP_PASSWORD || process.env.EMAIL_PASSWORD;
  const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
  const smtpPort = parseInt(process.env.SMTP_PORT || '465', 10); // Changed default port to 465

  console.log('📧 Initializing email transporter...');
  console.log('SMTP Configuration:', {
    host: smtpHost,
    port: smtpPort,
    email: smtpEmail ? `${smtpEmail.substring(0, 3)}***@${smtpEmail.split('@')[1]}` : '❌ Not Set',
    password: smtpPassword ? '✅ Set' : '❌ Not Set'
  });

  // Validate required fields
  if (!smtpEmail) {
    console.error('❌ SMTP_EMAIL is not set in environment variables!');
    throw new Error('SMTP_EMAIL environment variable is required');
  }

  if (!smtpPassword) {
    console.error('❌ SMTP_PASSWORD is not set in environment variables!');
    throw new Error('SMTP_PASSWORD environment variable is required');
  }

  // Create transporter with timeout settings
  transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: true, // Use SSL/TLS
    auth: {
      user: smtpEmail,
      pass: smtpPassword,
    },
    tls: {
      rejectUnauthorized: false // Accept self-signed certificates
    },
    connectionTimeout: 30000, // 30 seconds
    greetingTimeout: 30000,   // 30 seconds
    socketTimeout: 45000,     // 45 seconds
    debug: false, // Set to true for detailed SMTP logs
    logger: false // Set to true for connection logs
  });

  console.log('✅ Email transporter initialized successfully');

  return transporter;
};

/**
 * Send an email with timeout and proper error handling
 * @param {Object} options Email options
 * @param {string} options.to Recipient email
 * @param {string} options.subject Email subject
 * @param {string} options.text Plain text content
 * @param {string} options.html HTML content
 * @returns {Promise<Object>} Email send info or error
 */
const sendEmail = async ({ to, subject, text, html }) => {
  const startTime = Date.now();
  
  try {
    // Validate required fields
    if (!to) {
      console.error('❌ Recipient email is missing');
      return {
        error: true,
        message: 'Recipient email (to) is required'
      };
    }

    if (!subject) {
      console.error('❌ Email subject is missing');
      return {
        error: true,
        message: 'Email subject is required'
      };
    }

    if (!text && !html) {
      console.error('❌ Email content is missing');
      return {
        error: true,
        message: 'Email content (text or html) is required'
      };
    }

    // Initialize transporter
    const emailTransporter = initializeTransporter();

    const fromEmail = process.env.SMTP_EMAIL || process.env.EMAIL_USER || process.env.FROM_EMAIL;
    const fromName = process.env.FROM_NAME || 'ArtisanX AI';

    const mailOptions = {
      from: `"${fromName}" <${fromEmail}>`,
      to,
      subject,
      text: text || '',
      html: html || '',
    };

    console.log(`📤 Attempting to send email to: ${to}`);
    console.log(`📋 Subject: ${subject}`);

    // Create a promise with timeout
    const sendWithTimeout = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Email sending timed out after 20 seconds'));
      }, 20000); // 20 second timeout

      emailTransporter.sendMail(mailOptions)
        .then((info) => {
          clearTimeout(timeout);
          resolve(info);
        })
        .catch((err) => {
          clearTimeout(timeout);
          reject(err);
        });
    });

    const info = await sendWithTimeout;

    const duration = Date.now() - startTime;
    console.log(`✅ Email sent successfully in ${duration}ms`);
    console.log(`📬 Message ID: ${info.messageId}`);
    console.log(`📡 Response: ${info.response}`);

    return {
      error: false,
      success: true,
      messageId: info.messageId,
      response: info.response
    };

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ Error sending email after ${duration}ms:`, error.message);
    console.error('Error details:', {
      code: error.code,
      command: error.command,
      response: error.response,
      responseCode: error.responseCode
    });

    // Provide user-friendly error messages based on error type
    let userMessage = 'Failed to send email. Please try again later.';
    
    if (error.message.includes('timeout')) {
      userMessage = 'Email service timed out. Please try again.';
      console.error('💡 Tip: Check your SMTP server settings and network connectivity');
    } else if (error.code === 'EAUTH' || error.responseCode === 535) {
      userMessage = 'Email authentication failed. Please contact support.';
      console.error('💡 Tip: Check SMTP_EMAIL and SMTP_PASSWORD in environment variables');
      console.error('💡 For Gmail: Use App Password (https://myaccount.google.com/apppasswords)');
      console.error('💡 For Outlook: Use regular password');
    } else if (error.code === 'ECONNECTION' || error.code === 'ETIMEDOUT') {
      userMessage = 'Cannot connect to email server. Please try again.';
      console.error('💡 Tip: Check SMTP_HOST and SMTP_PORT settings');
    }

    return {
      error: true,
      message: userMessage,
      details: error.message,
      code: error.code
    };
  }
};

/**
 * Verify email configuration (for testing)
 * @returns {Promise<boolean>} True if configuration is valid
 */
const verifyConfiguration = async () => {
  try {
    console.log('🔍 Verifying email configuration...');
    const emailTransporter = initializeTransporter();
    
    const verifyWithTimeout = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Verification timed out after 10 seconds'));
      }, 10000);

      emailTransporter.verify()
        .then(() => {
          clearTimeout(timeout);
          resolve(true);
        })
        .catch((err) => {
          clearTimeout(timeout);
          reject(err);
        });
    });

    await verifyWithTimeout;
    console.log('✅ Email configuration verified successfully');
    return true;
  } catch (error) {
    console.error('❌ Email configuration verification failed:', error.message);
    return false;
  }
};

module.exports = {
  sendEmail,
  verifyConfiguration
};
