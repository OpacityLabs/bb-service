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
  verifyProof(circuit: CompiledCircuit, proof: ProofData): Promise<boolean>;
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
      try {
        const noir = new Noir(circuit);
        const { witness } = await noir.execute(input);
        await writeFileAsync(witnessPath, witness);
      } catch (witnessError) {
        console.error(`[BBCli] Witness generation failed:`, witnessError);
        throw witnessError;
      }

      // Run bb prove command
      // Create proof directory (BB creates 'proof' file inside it)
      const proofDir = join(tempDir, 'proof_dir');
      await this.mkdir(proofDir);
      
      const proveArgs = [
        'prove',
        '--scheme', 'ultra_honk',
        '-b', circuitPath,
        '-w', witnessPath,
        '-o', proofDir
      ];
      
      try {
        await this.runBBCommand(proveArgs);
      } catch (bbError) {
        console.error(`[BBCli] BB prove command failed:`, bbError);
        throw bbError;
      }

      // Read the generated proof
      try {
        const actualProofPath = join(proofDir, 'proof');
        const proofBuffer = await readFileAsync(actualProofPath);
        
        // Parse BB output format to ProofData
        return {
          proof: new Uint8Array(proofBuffer),
          publicInputs: [] // BB CLI doesn't separate public inputs in the same way
        };
        
      } catch (statError: any) {
        console.error(`[BBCli] Proof file reading failed:`, statError);
        throw new Error(`Proof file was not generated or could not be read: ${statError.message}`);
      }

    } catch (error) {
      console.error(`[BBCli] Proof generation failed:`, error);
      throw error;
    } finally {
      // Cleanup temp files
      try {
        const proofDir = join(tempDir, 'proof_dir');
        await this.cleanup(tempDir, [circuitPath, witnessPath, proofDir]);
      } catch (error) {
        console.warn('[BBCli] Failed to cleanup temp files:', error);
      }
    }
  }

  async verifyProof(circuit: CompiledCircuit, proof: ProofData): Promise<boolean> {
    // Generate a unique temporary directory for this verification
    const tempId = randomBytes(8).toString('hex');
    const tempDir = join(tmpdir(), `bb-verify-${tempId}`);
    
    // File paths
    const circuitPath = join(tempDir, 'circuit.json');
    const proofPath = join(tempDir, 'proof');
    let vkPath = join(tempDir, 'vk');

    try {
      // Create temp directory
      await this.mkdir(tempDir);

      // Write circuit to file
      await writeFileAsync(circuitPath, JSON.stringify(circuit));

      // Write proof to file - ensure it's a Uint8Array
      const proofData = proof.proof instanceof Uint8Array ? proof.proof : new Uint8Array(Object.values(proof.proof));
      await writeFileAsync(proofPath, proofData);

      // Step 1: Generate verification key from circuit
      // Create vk directory (BB creates 'vk' file inside it)
      const vkDir = join(tempDir, 'vk_dir');
      await this.mkdir(vkDir);
      
      try {
        await this.runBBCommand([
          'write_vk',
          '--scheme', 'ultra_honk',
          '-b', circuitPath,
          '-o', vkDir
        ]);
        
        // Update vkPath for the verify command
        vkPath = join(vkDir, 'vk');
      } catch (error) {
        console.error(`[BBCli] BB write_vk failed:`, error);
        return false;
      }

      // Step 2: Verify proof using the verification key
      try {
        await this.runBBCommand([
          'verify',
          '--scheme', 'ultra_honk',
          '-k', vkPath,
          '-p', proofPath
        ]);
        
        // If bb verify succeeds, the proof is valid
        return true;
      } catch (error) {
        // If bb verify fails, the proof is invalid (this is expected for invalid proofs)
        return false;
      }

    } finally {
      // Cleanup temp files
      try {
        const vkDir = join(tempDir, 'vk_dir');
        await this.cleanup(tempDir, [circuitPath, proofPath, vkDir]);
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
      
      let stderr = '';

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      process.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Failed to create directory: ${dir}. Code: ${code}, stderr: ${stderr}`));
        }
      });
      
      process.on('error', (error) => {
        reject(new Error(`Failed to spawn mkdir: ${error.message}`));
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