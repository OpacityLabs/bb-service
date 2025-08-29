import { spawn } from 'child_process';
import { promisify } from 'util';
import testCircuit from '../fixture/substring_sha256.json';

const sleep = promisify(setTimeout);

const testInput = {
  input_and_blinder: [72, 84, 84, 80, 47, 49, 46, 49, 32, 50, 48, 48, 32, 79, 75, 13, 10, 99, 111, 110, 116, 101, 110, 116, 45, 116, 121, 112, 101, 58, 32, 97, 112, 112, 108, 105, 99, 97, 116, 105, 111, 110, 47, 106, 115, 111, 110, 13, 10, 99, 111, 110, 116, 101, 110, 116, 45, 108, 101, 110, 103, 116, 104, 58, 32, 55, 50, 50, 13, 10, 99, 111, 110, 110, 101, 99, 116, 105, 111, 110, 58, 32, 99, 108, 111, 115, 101, 13, 10, 100, 97, 116, 101, 58, 32, 77, 111, 110, 44, 32, 50, 53, 32, 65, 117, 103, 32, 50, 48, 50, 53, 32, 48, 54, 58, 50, 51, 58, 52, 48, 32, 71, 77, 84, 13, 10, 13, 10, 123, 34, 105, 100, 34, 58, 49, 50, 51, 52, 53, 54, 55, 56, 57, 48, 44, 34, 105, 110, 102, 111, 114, 109, 97, 116, 105, 111, 110, 34, 58, 123, 34, 97, 100, 100, 114, 101, 115, 115, 34, 58, 123, 34, 99, 105, 116, 121, 34, 58, 34, 65, 110, 121, 116, 111, 119, 110, 34, 44, 34, 112, 111, 115, 116, 97, 108, 67, 111, 100, 101, 34, 58, 34, 49, 50, 51, 52, 53, 34, 44, 34, 115, 116, 97, 116, 101, 34, 58, 34, 88, 89, 34, 44, 34, 115, 116, 114, 101, 101, 116, 34, 58, 34, 49, 50, 51, 32, 69, 108, 109, 32, 83, 116, 114, 101, 101, 116, 34, 125, 44, 34, 100, 101, 115, 99, 114, 105, 112, 116, 105, 111, 110, 34, 58, 34, 74, 111, 104, 110, 32, 105, 115, 32, 97, 32, 115, 111, 102, 116, 119, 97, 114, 101, 32, 101, 110, 103, 105, 110, 101, 101, 114, 46, 32, 72, 101, 32, 101, 110, 106, 111, 121, 115, 32, 104, 105, 107, 105, 110, 103, 44, 32, 112, 108, 97, 121, 105, 110, 103, 32, 118, 105, 100, 101, 111, 32, 103, 97, 109, 101, 115, 44, 32, 97, 110, 100, 32, 114, 101, 97, 100, 105, 110, 103, 32, 98, 111, 111, 107, 115, 46, 32, 72, 105, 115, 32, 102, 97, 118, 111, 114, 105, 116, 101, 32, 98, 111, 111, 107, 32, 105, 115, 32, 39, 77, 111, 98, 121, 32, 68, 105, 99, 107, 39, 46, 34, 44, 34, 101, 100, 117, 99, 97, 116, 105, 111, 110, 34, 58, 123, 34, 100, 101, 103, 114, 101, 101, 34, 58, 34, 66, 97, 99, 104, 101, 108, 111, 114, 39, 115, 32, 105, 110, 32, 67, 111, 109, 112, 117, 116, 101, 114, 32, 83, 99, 105, 101, 110, 99, 101, 34, 44, 34, 115, 99, 104, 111, 111, 108, 34, 58, 34, 65, 110, 121, 116, 111, 119, 110, 32, 85, 110, 105, 118, 101, 114, 115, 105, 116, 121, 34, 125, 44, 34, 102, 97, 109, 105, 108, 121, 34, 58, 123, 34, 112, 97, 114, 101, 110, 116, 115, 34, 58, 123, 34, 102, 97, 116, 104, 101, 114, 34, 58, 123, 34, 97, 103, 101, 34, 58, 53, 53, 44, 34, 110, 97, 109, 101, 34, 58, 34, 74, 97, 109, 101, 115, 32, 68, 111, 101, 34, 125, 44, 34, 109, 111, 116, 104, 101, 114, 34, 58, 123, 34, 97, 103, 101, 34, 58, 53, 51, 44, 34, 110, 97, 109, 101, 34, 58, 34, 74, 101, 110, 110, 121, 32, 68, 111, 101, 34, 125, 125, 44, 34, 115, 105, 98, 108, 105, 110, 103, 115, 34, 58, 91, 123, 34, 97, 103, 101, 34, 58, 50, 52, 44, 34, 110, 97, 109, 101, 34, 58, 34, 74, 97, 110, 101, 32, 68, 111, 101, 34, 44, 34, 114, 101, 108, 97, 116, 105, 111, 110, 34, 58, 34, 83, 105, 115, 116, 101, 114, 34, 125, 44, 123, 34, 97, 103, 101, 34, 58, 50, 48, 44, 34, 110, 97, 109, 101, 34, 58, 34, 74, 97, 99, 107, 32, 68, 111, 101, 34, 44, 34, 114, 101, 108, 97, 116, 105, 111, 110, 34, 58, 34, 66, 114, 111, 116, 104, 101, 114, 34, 125, 93, 125, 44, 34, 102, 97, 118, 111, 114, 105, 116, 101, 67, 111, 108, 111, 114, 115, 34, 58, 91, 34, 98, 108, 117, 101, 34, 44, 34, 114, 101, 100, 34, 44, 34, 103, 114, 101, 101, 110, 34, 44, 34, 121, 101, 108, 108, 111, 119, 34, 93, 44, 34, 110, 97, 109, 101, 34, 58, 34, 74, 111, 104, 110, 32, 68, 111, 101, 34, 125, 44, 34, 109, 101, 116, 97, 34, 58, 123, 34, 99, 114, 101, 97, 116, 101, 100, 65, 116, 34, 58, 34, 50, 48, 50, 50, 45, 48, 49, 45, 49, 53, 84, 49, 52, 58, 53, 50, 58, 53, 53, 90, 34, 44, 34, 108, 97, 115, 116, 85, 112, 100, 97, 116, 101, 100, 65, 116, 34, 58, 34, 50, 48, 50, 51, 45, 48, 49, 45, 49, 50, 84, 49, 54, 58, 52, 50, 58, 49, 48, 90, 34, 44, 34, 118, 101, 114, 115, 105, 111, 110, 34, 58, 49, 46, 50, 125, 125, 112, 19, 94, 251, 226, 22, 216, 9, 47, 109, 54, 213, 133, 3, 204, 236, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  needle: [67, 111, 109, 112, 117, 116, 101, 114, 32, 83, 99, 105, 101, 110, 99, 101, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  input_length: 850,
  needle_length: 16
};

interface DockerTestContext {
  containerName: string;
  containerId?: string;
  port: number;
}

describe('Docker Integration Test', () => {
  let context: DockerTestContext;
  const timeout = 120000; // 2 minutes timeout for Docker operations

  beforeAll(async () => {
    context = {
      containerName: `bb-service-test-${Date.now()}`,
      port: 3001 // Use different port to avoid conflicts
    };
    
    // Rebuild Docker image to ensure latest changes are included
    console.log('Rebuilding Docker image...');
    await runCommand('docker', [
      'build',
      '-t', 'bb-service-test',
      '.'
    ]);
    
    console.log('Starting Docker container...');
    const result = await runCommand('docker', [
      'run',
      '-d',
      '--name', context.containerName,
      '-p', `${context.port}:3000`,
      'bb-service-test'
    ]);
    
    context.containerId = result.stdout.trim();
    
    // Wait for container to be ready
    console.log('Waiting for container to be ready...');
    await waitForService(`http://localhost:${context.port}`, 60000);
    
  }, timeout);

  afterAll(async () => {
    if (context.containerName) {
      console.log('Cleaning up Docker container...');
      try {
        await runCommand('docker', ['stop', context.containerName]);
        await runCommand('docker', ['rm', context.containerName]);
      } catch (error) {
        console.warn('Error during cleanup:', error);
      }
    }
  }, 30000);

  it('should generate proof using real BB CLI in Docker', async () => {
    const requestBody = {
      circuit: testCircuit,
      input: testInput
    };

    console.log('Sending prove request to Docker container...');
    const response = await fetch(`http://localhost:${context.port}/prove`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });
    
    expect(response.status).toBe(200);

    const responseBody = await response.json();
    expect(responseBody.message).toBe('Proof generated successfully');
    expect(responseBody.proof).toBeDefined();
    expect(responseBody.proof.proof).toBeDefined();
    
    // Verify proof is returned as array of numbers, not object with string keys
    expect(Array.isArray(responseBody.proof.proof)).toBe(true);
    expect(responseBody.proof.proof.length).toBeGreaterThan(0);
    expect(responseBody.proof.proof.every((item: any) => typeof item === 'number')).toBe(true);

    // Verify the proof using the /verify endpoint
    console.log('Verifying proof with /verify endpoint...');
    const verifyResponse = await fetch(`http://localhost:${context.port}/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        circuit: testCircuit,
        proof: responseBody.proof
      })
    });

    const verifyBody = await verifyResponse.json();
    
    expect(verifyResponse.status).toBe(200);
    expect(verifyBody.message).toBe('Proof verification completed');
    expect(verifyBody.isValid).toBe(true);
    console.log('Proof verification successful!');
  }, timeout);

  it('should respond to health check', async () => {
    const response = await fetch(`http://localhost:${context.port}/health`);
    
    expect(response.status).toBe(200);
    
    const responseBody = await response.json();
    expect(responseBody.status).toBe('healthy');
    expect(responseBody.service).toBe('bb-service');
    expect(responseBody.timestamp).toBeDefined();
    expect(new Date(responseBody.timestamp)).toBeInstanceOf(Date);
  });

  it('should handle invalid circuit in Docker', async () => {
    const invalidRequest = {
      circuit: {
        bytecode: 'invalid-bytecode',
        abi: { parameters: [] },
        debug_symbols: 'invalid-debug',
        file_map: {}
      },
      input: { x: 1, y: 2 }
    };

    const response = await fetch(`http://localhost:${context.port}/prove`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(invalidRequest)
    });

    expect(response.status).toBe(500);
    const responseBody = await response.json();
    expect(responseBody.error).toBe('Failed to generate proof');
  }, timeout);
});

// Utility functions

interface CommandResult {
  stdout: string;
  stderr: string;
  code: number;
}

async function runCommand(command: string, args: string[]): Promise<CommandResult> {
  return new Promise((resolve, reject) => {
    const process = spawn(command, args, { stdio: 'pipe' });
    
    let stdout = '';
    let stderr = '';

    process.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    process.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    process.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr, code });
      } else {
        reject(new Error(`Command failed: ${command} ${args.join(' ')}\nstdout: ${stdout}\nstderr: ${stderr}\ncode: ${code}`));
      }
    });

    process.on('error', (error) => {
      reject(new Error(`Failed to spawn command: ${error.message}`));
    });
  });
}

async function waitForService(url: string, timeoutMs: number): Promise<void> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeoutMs) {
    try {
      const response = await fetch(url + '/prove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}) // Send empty body to trigger validation error
      });
      
      // If we get any response (even 400), the service is up
      if (response.status === 400) {
        console.log('Service is ready!');
        return;
      }
    } catch (error) {
      // Service not ready yet, continue waiting
    }
    
    await sleep(2000); // Wait 2 seconds before retrying
  }
  
  throw new Error(`Service at ${url} did not become ready within ${timeoutMs}ms`);
}