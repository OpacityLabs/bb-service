import { spawn } from 'child_process';
import { promisify } from 'util';
import { writeFile, readFile, unlink } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { randomBytes } from 'crypto';
import { CompiledCircuit, InputMap } from '@noir-lang/noir_js';
import { ProofData } from '@noir-lang/types';
import { Noir } from '@noir-lang/noir_js';

const writeFileAsync = promisify(writeFile);
const readFileAsync = promisify(readFile);
const unlinkAsync = promisify(unlink);

export interface BBCli {
  generateProof(circuit: CompiledCircuit, input: InputMap): Promise<ProofData>;
}

export class DefaultBBCli implements BBCli {
  private bbPath: string;

  constructor(bbPath: string = 'bb') {
    this.bbPath = bbPath;
  }

  async generateProof(circuit: CompiledCircuit, input: InputMap): Promise<ProofData> {
    // Generate a unique temporary directory for this proof
    const tempId = randomBytes(8).toString('hex');
    const tempDir = join(tmpdir(), `bb-proof-${tempId}`);
    
    // File paths
    const circuitPath = join(tempDir, 'circuit.json');
    const witnessPath = join(tempDir, 'witness.gz');
    const proofPath = join(tempDir, 'proof');

    try {
      // Create temp directory
      await this.mkdir(tempDir);

      // Write circuit to file
      await writeFileAsync(circuitPath, JSON.stringify(circuit));

      // Generate witness using Noir
      const noir = new Noir(circuit);
      const { witness } = await noir.execute(input);
      await writeFileAsync(witnessPath, witness);

      // Run bb prove command
      await this.runBBCommand([
        'prove',
        '--scheme', 'ultra_honk',
        '-b', circuitPath,
        '-w', witnessPath,
        '-o', proofPath
      ]);

      // Read the generated proof
      const proofBuffer = await readFileAsync(proofPath);
      
      // Parse BB output format to ProofData
      // Note: This is a simplified parsing - you may need to adjust based on actual BB output format
      return {
        proof: new Uint8Array(proofBuffer),
        publicInputs: [] // BB CLI doesn't separate public inputs in the same way
      };

    } finally {
      // Cleanup temp files
      try {
        await this.cleanup(tempDir, [circuitPath, witnessPath, proofPath]);
      } catch (error) {
        console.warn('Failed to cleanup temp files:', error);
      }
    }
  }

  private async runBBCommand(args: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const process = spawn(this.bbPath, args, { stdio: 'pipe' });
      
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
          resolve();
        } else {
          reject(new Error(`BB CLI failed with code ${code}. stderr: ${stderr}, stdout: ${stdout}`));
        }
      });

      process.on('error', (error) => {
        reject(new Error(`Failed to spawn BB CLI: ${error.message}`));
      });
    });
  }

  private async mkdir(dir: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const process = spawn('mkdir', ['-p', dir]);
      process.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Failed to create directory: ${dir}`));
        }
      });
    });
  }

  private async cleanup(tempDir: string, files: string[]): Promise<void> {
    // Remove individual files
    for (const file of files) {
      try {
        await unlinkAsync(file);
      } catch (error) {
        // Ignore file not found errors
      }
    }
    
    // Remove temp directory
    return new Promise((resolve) => {
      const process = spawn('rm', ['-rf', tempDir]);
      process.on('close', () => resolve()); // Always resolve, ignore errors
    });
  }
}