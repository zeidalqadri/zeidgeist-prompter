const { spawn } = require('child_process');
const path = require('path');
const net = require('net');
const fs = require('fs');

// Load environment variables from .env file in the root directory
function loadEnvVariables() {
  try {
    const envPath = path.join(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      console.log('Loading environment variables from .env file...');
      const envContent = fs.readFileSync(envPath, 'utf8');
      const envVars = {};
      
      // Parse each line of the .env file
      envContent.split('\n').forEach(line => {
        line = line.trim();
        if (line && !line.startsWith('#')) {
          const [key, value] = line.split('=');
          if (key && value) {
            envVars[key.trim()] = value.trim();
            // Set in process.env for current process
            process.env[key.trim()] = value.trim();
          }
        }
      });
      
      return envVars;
    }
  } catch (error) {
    console.error('Error loading .env file:', error);
  }
  return {};
}

// Default ports
const DEFAULT_FRONTEND_PORT = 3333;
const DEFAULT_BACKEND_PORT = 8084;

// Function to check if a port is in use
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer()
      .once('error', () => {
        // Port is in use
        resolve(false);
      })
      .once('listening', () => {
        // Port is available
        server.close();
        resolve(true);
      })
      .listen(port);
  });
}

// Function to find the first available port starting from the specified one
async function findAvailablePort(startPort) {
  let port = startPort;
  while (!(await isPortAvailable(port))) {
    console.log(`Port ${port} is in use, trying ${port + 1}...`);
    port++;
    // Avoid infinite loops by setting a reasonable limit
    if (port > startPort + 100) {
      throw new Error('Could not find an available port after 100 attempts');
    }
  }
  return port;
}

// Main function to initialize the services
async function startServices() {
  try {
    // Load environment variables
    const envVars = loadEnvVariables();
    
    // Find available ports for frontend and backend
    const frontendPort = await findAvailablePort(DEFAULT_FRONTEND_PORT);
    const backendPort = await findAvailablePort(DEFAULT_BACKEND_PORT);

    // Set environment variables for the ports
    process.env.NEXT_PORT = frontendPort.toString();
    process.env.PORT = backendPort.toString();

    console.log('Starting the frontend and backend services...');
    console.log(`Frontend port: ${process.env.NEXT_PORT}`);
    console.log(`Backend port: ${process.env.PORT}`);
    
    // Create combined environment with all variables
    const combinedEnv = {
      ...process.env,
      PORT: process.env.NEXT_PORT,
      ...envVars,
    };
    
    // Start the frontend development server
    const frontendProc = spawn('npm', ['run', 'dev'], {
      stdio: 'pipe',
      cwd: path.join(process.cwd(), 'frontend'),
    });

    console.log('Frontend process started');
    console.log('Waiting for frontend to initialize before starting backend...');

    // Wait a moment for frontend to start
    setTimeout(() => {
      // Create backend environment variables
      const backendEnv = {
        ...process.env,
        NEXT_PORT: process.env.NEXT_PORT,
        PORT: process.env.PORT,
        ...envVars,
      };
      
      // Start the backend API server
      const backendProcess = spawn('npm', ['run', 'dev'], {
        stdio: 'inherit',
        cwd: path.join(process.cwd(), 'backend'),
        env: backendEnv
      });

      console.log('Backend process started');

      // Function to handle script termination
      const cleanup = () => {
        console.log('Shutting down services...');
        frontendProc.kill();
        backendProcess.kill();
      };

      // Set up trap for clean shutdown
      process.on('SIGINT', cleanup);
      process.on('SIGTERM', cleanup);
      process.on('exit', cleanup);

    }, 5000); // 5 second delay
  } catch (error) {
    console.error('Error starting services:', error);
    process.exit(1);
  }
}

// Run the services
startServices(); 