/**
 * Alternative Email Service for Render Deployment
 * 
 * This service uses a different approach that's more compatible with Render's environment.
 */

import nodemailer from 'nodemailer';

// Cache the transporter to avoid creating a new one for each email
let cachedTransporter = null;

/**
 * Initialize email transporter with a different configuration for Render
 * @returns {Promise<nodemailer.Transporter>} Nodemailer transporter
 */
const initializeTransporter = async () => {
  // If we already have a transporter, return it
  if (cachedTransporter) {
    return cachedTransporter;
  }

  // For development/testing, use Ethereal
  if (process.env.NODE_ENV !== 'production' && !process.env.EMAIL_APP_PASSWORD) {
    try {
      const testAccount = await nodemailer.createTestAccount();
      console.log('Created test email account:', testAccount.user);
      
      cachedTransporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
      
      return cachedTransporter;
    } catch (error) {
      console.error('Failed to create test email account:', error);
      return createConsoleTransport();
    }
  }

  // For production on Render, use Gmail with a different configuration
  try {
    // Try port 587 with TLS instead of 465 with SSL
    cachedTransporter = nodemailer.createTransport({
      service: 'gmail',
      host: 'smtp.gmail.com',
      port: 587,
      secure: false, // Use TLS instead of SSL
      auth: {
        user: process.env.EMAIL_USER || 'adhithanraja6@gmail.com',
        pass: process.env.EMAIL_APP_PASSWORD || '',
      },
      tls: {
        // Do not fail on invalid certs
        rejectUnauthorized: false
      }
    });

    // Verify the connection
    await cachedTransporter.verify();
    console.log('Email service connected successfully (TLS mode)');
    
    return cachedTransporter;
  } catch (error) {
    console.error('Failed to create email transporter with TLS:', error);
    
    try {
      // Fall back to direct SMTP configuration
      console.log('Trying alternative SMTP configuration...');
      
      cachedTransporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
          user: process.env.EMAIL_USER || 'adhithanraja6@gmail.com',
          pass: process.env.EMAIL_APP_PASSWORD || '',
        },
        tls: {
          rejectUnauthorized: false
        }
      });
      
      await cachedTransporter.verify();
      console.log('Email service connected successfully (alternative config)');
      
      return cachedTransporter;
    } catch (fallbackError) {
      console.error('Failed to create email transporter with alternative config:', fallbackError);
      return createConsoleTransport();
    }
  }
};

/**
 * Create a console transport for development/fallback
 * @returns {nodemailer.Transporter} Console transport
 */
const createConsoleTransport = () => {
  console.log('Using console transport for emails (emails will be logged to console)');
  
  return nodemailer.createTransport({
    name: 'console-transport',
    version: '1.0.0',
    send: (mail, callback) => {
      const input = mail.message.createReadStream();
      let message = '';
      
      input.on('data', (chunk) => {
        message += chunk;
      });
      
      input.on('end', () => {
        console.log('----------------------');
        console.log('Email would be sent:');
        console.log('----------------------');
        console.log(message);
        console.log('----------------------');
        
        callback(null, { response: 'Email logged to console' });
      });
    },
  });
};

/**
 * Send an email with enhanced error handling for Render
 * @param {Object} options Email options
 * @param {string} options.to Recipient email
 * @param {string} options.subject Email subject
 * @param {string} options.text Plain text content
 * @param {string} options.html HTML content
 * @returns {Promise<Object>} Email send info
 */
export const sendEmail = async ({ to, subject, text, html }) => {
  try {
    // Validate required fields
    if (!to) {
      throw new Error('Recipient email (to) is required');
    }

    if (!subject) {
      throw new Error('Email subject is required');
    }

    if (!text && !html) {
      throw new Error('Email content (text or html) is required');
    }

    const emailTransporter = await initializeTransporter();

    const mailOptions = {
      from: process.env.EMAIL_FROM || 'Adhithan Raja <adhithanraja6@gmail.com>',
      to,
      subject,
      text: text || '',
      html: html || '',
    };

    console.log(`Sending email to ${to} with subject: ${subject}`);
    const info = await emailTransporter.sendMail(mailOptions);

    // Log preview URL in development
    if (info.messageId && nodemailer.getTestMessageUrl && nodemailer.getTestMessageUrl(info)) {
      console.log('Email preview URL: %s', nodemailer.getTestMessageUrl(info));
    }

    console.log('Email sent successfully:', info.response || info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    
    // Return a structured error response instead of throwing
    return {
      error: true,
      message: error.message,
      details: error.toString(),
      code: error.code,
      command: error.command
    };
  }
};

export default {
  sendEmail,
};
