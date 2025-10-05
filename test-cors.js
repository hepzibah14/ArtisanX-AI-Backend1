const express = require('express');
const cors = require('cors');
const app = express();

// Test CORS configuration from environment
const corsOrigins = process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:3001';
const allowedOrigins = corsOrigins.split(',').map(origin => origin.trim());

console.log('🔍 Testing CORS Configuration:');
console.log('Allowed origins from env:', allowedOrigins);

const corsOptions = {
  origin: function (origin, callback) {
    console.log('Request origin:', origin);
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn('⚠️ CORS blocked request from origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Content-Range']
};

app.use(cors(corsOptions));
app.use(express.json());

// Handle preflight for all routes
app.options('*', cors());

app.get('/test-cors', (req, res) => {
  res.json({ message: 'CORS test successful', allowedOrigins });
});

app.listen(3000, () => {
  console.log('🧪 CORS Test Server running on port 3000');
  console.log('Test with: curl -H "Origin: https://artisanx-ai.onrender.com" -X OPTIONS http://localhost:3000/test-cors');
});