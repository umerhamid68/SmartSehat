// Environment configuration
const ENV = {
  dev: {
    apiUrl: 'http://192.168.19.11:5000/api',
  },
  staging: {
    apiUrl: 'https://staging-api.smartsehat.com/api',
  },
  prod: {
    apiUrl: 'https://api.smartsehat.com/api',
  }
};

// Determine which environment to use
const getEnvVars = (env = process.env.NODE_ENV || 'development') => {
  if (env === 'development') {
    return ENV.dev;
  } else if (env === 'staging') {
    return ENV.staging;
  } else if (env === 'production') {
    return ENV.prod;
  }
};

// Export the variables
export const { apiUrl: API_URL } = getEnvVars(); 