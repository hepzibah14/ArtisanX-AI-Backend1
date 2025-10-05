const express = require('express');
const cors = require('cors');
const path = require('path');
const https = require('https');
require('dotenv').config();

// Import email service
const emailService = require('./emailService.js');

const app = express();
const PORT = process.env.PORT || 10000;

// Get the service URL from environment or construct it
const SERVICE_URL = process.env.RENDER_EXTERNAL_URL || 'https://artisanx-ai.onrender.com';

console.log('🔧 Starting ArtisanX AI Server...');
console.log('📍 Service URL:', SERVICE_URL);

// Configure CORS origins
const corsOrigins = process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:3001,https://artisanx-ai.onrender.com';
const allowedOrigins = corsOrigins.split(',').map(origin => origin.trim());

console.log('🔧 CORS Configuration:', {
  allowedOrigins: allowedOrigins,
  environment: process.env.ENVIRONMENT || 'development'
});

// Simplified CORS configuration - allow all origins
const corsOptions = {
  origin: true, // Allow all origins
  credentials: false,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 86400 // 24 hours
};

// Apply CORS middleware FIRST
app.use(cors(corsOptions));

// Handle preflight requests explicitly for ALL routes
app.options('*', cors(corsOptions));

// Parse JSON bodies
app.use(express.json());

// Add middleware to log all requests for debugging
app.use((req, res, next) => {
  console.log('📥 Incoming request:', {
    method: req.method,
    url: req.url,
    origin: req.headers.origin,
    userAgent: req.headers['user-agent']?.substring(0, 50) + '...',
    contentType: req.headers['content-type']
  });
  next();
});

// API routes
app.get('/api/health', (req, res) => {
  console.log('✅ Health check requested');
  res.status(200).json({
    status: 'UP',
    timestamp: new Date().toISOString(),
    service: 'ArtisanX AI',
    port: PORT,
    uptime: process.uptime(),
    keepAlive: '✅ Active'
  });
});

app.post('/api/contact', async (req, res) => {
  console.log('📧 Contact form submission received');
  console.log('Request origin:', req.headers.origin);
  console.log('Request body:', {
    name: req.body.name,
    email: req.body.email,
    hasPhone: !!req.body.phone,
    hasCompany: !!req.body.company,
    messageLength: req.body.message?.length
  });

  const { name, email, message, phone, company } = req.body;

  // Validate required fields
  if (!name || !email || !message) {
    console.error('❌ Validation failed: Missing required fields');
    return res.status(400).json({
      error: 'Name, email, and message are required fields.',
      missing: {
        name: !name,
        email: !email,
        message: !message
      }
    });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    console.error('❌ Validation failed: Invalid email format');
    return res.status(400).json({ error: 'Invalid email format.' });
  }

  try {
    console.log('📤 Sending email to:', process.env.TO_EMAIL);

    // Format timestamp
    const timestamp = new Date().toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });

    // Use the email service to send the email
    const result = await emailService.sendEmail({
      to: process.env.TO_EMAIL,
      subject: `✨ New Contact Form Submission from ${name}`,
      text: `You have received a new message from ${name} (${email}):\n\n${message}\n\n${phone ? `Phone: ${phone}\n` : ''}${company ? `Company: ${company}` : ''}\n\nReceived at: ${timestamp}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
          <div style="max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
            
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px 20px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">
                ✨ New Contact Form Submission
              </h1>
              <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 14px; opacity: 0.9;">
                ${timestamp}
              </p>
            </div>
            
            <!-- Content -->
            <div style="padding: 30px 20px; background-color: #ffffff;">
              
              <!-- Name -->
              <div style="margin-bottom: 20px; display: flex; align-items: flex-start;">
                <div style="margin-right: 12px; font-size: 20px;">👤</div>
                <div>
                  <div style="color: #667eea; font-weight: 600; font-size: 14px; margin-bottom: 4px;">Name:</div>
                  <div style="color: #333333; font-size: 16px;">${name}</div>
                </div>
              </div>
              
              <!-- Email -->
              <div style="margin-bottom: 20px; display: flex; align-items: flex-start;">
                <div style="margin-right: 12px; font-size: 20px;">📧</div>
                <div>
                  <div style="color: #667eea; font-weight: 600; font-size: 14px; margin-bottom: 4px;">Email:</div>
                  <div style="color: #333333; font-size: 16px;">
                    <a href="mailto:${email}" style="color: #667eea; text-decoration: none;">${email}</a>
                  </div>
                </div>
              </div>
              
              <!-- Phone -->
              ${phone ? `
              <div style="margin-bottom: 20px; display: flex; align-items: flex-start;">
                <div style="margin-right: 12px; font-size: 20px;">📞</div>
                <div>
                  <div style="color: #667eea; font-weight: 600; font-size: 14px; margin-bottom: 4px;">Phone:</div>
                  <div style="color: #333333; font-size: 16px;">${phone}</div>
                </div>
              </div>
              ` : ''}
              
              <!-- Company -->
              ${company ? `
              <div style="margin-bottom: 20px; display: flex; align-items: flex-start;">
                <div style="margin-right: 12px; font-size: 20px;">🏢</div>
                <div>
                  <div style="color: #667eea; font-weight: 600; font-size: 14px; margin-bottom: 4px;">Company:</div>
                  <div style="color: #333333; font-size: 16px;">${company}</div>
                </div>
              </div>
              ` : ''}
              
              <!-- Message -->
              <div style="margin-bottom: 20px; display: flex; align-items: flex-start;">
                <div style="margin-right: 12px; font-size: 20px;">💬</div>
                <div style="flex: 1;">
                  <div style="color: #667eea; font-weight: 600; font-size: 14px; margin-bottom: 8px;">Message:</div>
                  <div style="background-color: #f5f7fa; border-left: 4px solid #667eea; padding: 15px; border-radius: 4px; color: #333333; font-size: 15px; line-height: 1.6; white-space: pre-wrap;">${message}</div>
                </div>
              </div>
              
            </div>
            
            <!-- Footer -->
            <div style="background-color: #f5f7fa; padding: 20px; text-align: center; border-top: 1px solid #e0e0e0;">
              <p style="color: #999999; font-size: 12px; margin: 0;">
                This email was sent from the <strong>ArtisanX AI</strong> contact form<br>
                Received at ${timestamp}
              </p>
            </div>
            
          </div>
        </body>
        </html>
      `
    });

    if (result.error) {
      console.error('❌ Email service error:', result);
      return res.status(500).json({
        error: 'Failed to send email. Please try again later.',
        details: process.env.NODE_ENV === 'development' ? result.message : undefined
      });
    }

    console.log('✅ Email sent successfully');
    res.status(200).json({
      message: 'Email sent successfully.',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('💥 Error sending email:', error);
    res.status(500).json({
      error: 'Failed to send email. Please try again later.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../frontend/build')));

// Catch-all route to serve React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/build', 'index.html'));
});

// CRITICAL: Listen on 0.0.0.0 for Render
app.listen(PORT, '0.0.0.0', () => {
  console.log('\n🚀 ========================================');
  console.log('   ArtisanX AI Server Started');
  console.log('========================================');
  console.log(`📍 Port: ${PORT}`);
  console.log(`🌍 Host: 0.0.0.0 (all interfaces)`);
  console.log(`🌐 URL: ${SERVICE_URL}`);
  console.log(`🌍 Environment: ${process.env.ENVIRONMENT || 'development'}`);
  console.log(`📧 Email Service: ${process.env.SMTP_EMAIL ? '✅ Configured' : '❌ Not Configured'}`);
  console.log(`📬 Recipient Email: ${process.env.TO_EMAIL || '❌ Not Set'}`);
  console.log(`🔒 CORS: ✅ Enabled (all origins)`);
  console.log(`⏰ Started at: ${new Date().toLocaleString()}`);
  console.log('========================================\n');
  console.log('📡 API Endpoints:');
  console.log(`   GET  /api/health  - Health check`);
  console.log(`   POST /api/contact - Contact form submission`);
  console.log('========================================\n');

  // Start keep-alive ping (only in production)
  if (process.env.NODE_ENV === 'production' || process.env.RENDER) {
    startKeepAlivePing();
  }
});

// Keep-Alive Ping Function
// Pings the service every 25 seconds to prevent Render free tier from spinning down
function startKeepAlivePing() {
  const PING_INTERVAL = 25000; // 25 seconds
  let pingCount = 0;

  console.log('🔄 Starting keep-alive ping...');
  console.log(`⏱️  Ping interval: ${PING_INTERVAL / 1000} seconds`);
  console.log(`🎯 Target: ${SERVICE_URL}/api/health\n`);

  const ping = () => {
    const url = new URL(`${SERVICE_URL}/api/health`);
    
    https.get(url, (res) => {
      pingCount++;
      if (res.statusCode === 200) {
        console.log(`💚 Keep-alive ping #${pingCount} successful - Service is UP`);
      } else {
        console.log(`⚠️  Keep-alive ping #${pingCount} returned status: ${res.statusCode}`);
      }
    }).on('error', (err) => {
      console.error(`❌ Keep-alive ping #${pingCount} failed:`, err.message);
    });
  };

  // First ping after 30 seconds (give service time to fully start)
  setTimeout(() => {
    ping();
    // Then ping every 25 seconds
    setInterval(ping, PING_INTERVAL);
  }, 30000);

  console.log('✅ Keep-alive system initialized\n');
  console.log('📝 Service will ping itself every 25 seconds to stay awake');
  console.log('💡 This prevents Render free tier from spinning down\n');
}
