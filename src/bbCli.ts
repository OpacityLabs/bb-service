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
    
    console.log(`[BBCli] Starting proof generation with tempDir: ${tempDir}`);
    console.log(`[BBCli] BB path: ${this.bbPath}`);
    
    // File paths
    const circuitPath = join(tempDir, 'circuit.json');
    const witnessPath = join(tempDir, 'witness.gz');
    const proofPath = join(tempDir, 'proof');

    console.log(`[BBCli] File paths:`, {
      circuitPath,
      witnessPath,
      proofPath
    });

    try {
      // Create temp directory
      console.log(`[BBCli] Creating temp directory...`);
      await this.mkdir(tempDir);
      console.log(`[BBCli] Temp directory created successfully`);

      // Write circuit to file
      console.log(`[BBCli] Writing circuit to file...`);
      console.log(`[BBCli] Circuit keys:`, Object.keys(circuit));
      console.log(`[BBCli] Circuit bytecode length:`, circuit.bytecode?.length);
      await writeFileAsync(circuitPath, JSON.stringify(circuit));
      console.log(`[BBCli] Circuit written successfully`);

      // Generate witness using Noir
      console.log(`[BBCli] Generating witness using Noir...`);
      // console.log(`[BBCli] Input:`, JSON.stringify(input, null, 2));
      
      try {
        const noir = new Noir(circuit);
        console.log(`[BBCli] Noir instance created`);
        
        const { witness } = await noir.execute(input);
        console.log(`[BBCli] Witness generated, length:`, witness?.length);
        
        await writeFileAsync(witnessPath, witness);
        console.log(`[BBCli] Witness written to file`);
      } catch (witnessError) {
        console.error(`[BBCli] Witness generation failed:`, witnessError);
        throw witnessError;
      }

      // Run bb prove command
      console.log(`[BBCli] Running BB prove command...`);
      
      // Create proof directory if needed (BB might expect a directory)
      const proofDir = join(tempDir, 'proof_dir');
      await this.mkdir(proofDir);
      
      const proveArgs = [
        'prove',
        '--scheme', 'ultra_honk',
        '-b', circuitPath,
        '-w', witnessPath,
        '-o', proofDir
      ];
      console.log(`[BBCli] BB command:`, this.bbPath, proveArgs.join(' '));
      
      try {
        await this.runBBCommand(proveArgs);
        console.log(`[BBCli] BB prove command completed successfully`);
      } catch (bbError) {
        console.error(`[BBCli] BB prove command failed:`, bbError);
        throw bbError;
      }

      // Check what files were created in the proof directory
      console.log(`[BBCli] Checking proof directory contents...`);
      try {
        const fs = require('fs').promises;
        const files = await fs.readdir(proofDir);
        console.log(`[BBCli] Files in proof directory:`, files);
        
        const actualProofPath = join(proofDir, 'proof');
        const stats = await fs.stat(actualProofPath);
        console.log(`[BBCli] Proof file exists at ${actualProofPath}, size:`, stats.size);
        
        // Read the generated proof
        console.log(`[BBCli] Reading generated proof...`);
        const proofBuffer = await readFileAsync(actualProofPath);
        console.log(`[BBCli] Proof read, buffer length:`, proofBuffer.length);
        
        // Parse BB output format to ProofData
        // Note: This is a simplified parsing - you may need to adjust based on actual BB output format
        const result = {
          proof: new Uint8Array(proofBuffer),
          publicInputs: [] // BB CLI doesn't separate public inputs in the same way
        };
        
        console.log(`[BBCli] Proof generation completed successfully`);
        return result;
        
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
        console.log(`[BBCli] Cleaning up temp files...`);
        const proofDir = join(tempDir, 'proof_dir');
        await this.cleanup(tempDir, [circuitPath, witnessPath, proofDir]);
        console.log(`[BBCli] Cleanup completed`);
      } catch (error) {
        console.warn('[BBCli] Failed to cleanup temp files:', error);
      }
    }
  }

  async verifyProof(circuit: CompiledCircuit, proof: ProofData): Promise<boolean> {
    // Generate a unique temporary directory for this verification
    const tempId = randomBytes(8).toString('hex');
    const tempDir = join(tmpdir(), `bb-verify-${tempId}`);
    
    console.log(`[BBCli] Starting proof verification with tempDir: ${tempDir}`);
    console.log(`[BBCli] Proof type:`, typeof proof.proof, 'proof keys:', Object.keys(proof).length);
    
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
      console.log(`[BBCli] Converting proof data, original type:`, typeof proof.proof, 'length:', proofData.length);
      await writeFileAsync(proofPath, proofData);

      // Step 1: Generate verification key from circuit
      console.log(`[BBCli] Step 1: Generating verification key...`);
      
      // Create vk directory (BB will create 'vk' file inside it)
      const vkDir = join(tempDir, 'vk_dir');
      await this.mkdir(vkDir);
      
      try {
        await this.runBBCommand([
          'write_vk',
          '--scheme', 'ultra_honk',
          '-b', circuitPath,
          '-o', vkDir
        ]);
        console.log(`[BBCli] Verification key generated successfully`);
        
        // Check if vk file was created inside the directory
        const fs = require('fs').promises;
        const actualVkPath = join(vkDir, 'vk');
        const vkStats = await fs.stat(actualVkPath);
        console.log(`[BBCli] VK file size: ${vkStats.size} bytes`);
        
        // Update vkPath for the verify command
        vkPath = actualVkPath;
      } catch (error) {
        console.error(`[BBCli] BB write_vk failed:`, error);
        return false;
      }

      // Step 2: Verify proof using the verification key
      console.log(`[BBCli] Step 2: Verifying proof...`);
      try {
        await this.runBBCommand([
          'verify',
          '--scheme', 'ultra_honk',
          '-k', vkPath,
          '-p', proofPath
        ]);
        
        // If bb verify succeeds, the proof is valid
        console.log(`[BBCli] Proof verification succeeded`);
        return true;
      } catch (error) {
        // If bb verify fails, the proof is invalid
        console.error(`[BBCli] BB verify failed:`, error);
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
    console.log(`[BBCli] Executing command: ${this.bbPath} ${args.join(' ')}`);
    
    return new Promise((resolve, reject) => {
      const process = spawn(this.bbPath, args, { stdio: 'pipe' });
      
      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => {
        const chunk = data.toString();
        stdout += chunk;
        console.log(`[BBCli] stdout:`, chunk.trim());
      });

      process.stderr.on('data', (data) => {
        const chunk = data.toString();
        stderr += chunk;
        console.log(`[BBCli] stderr:`, chunk.trim());
      });

      process.on('close', (code) => {
        console.log(`[BBCli] Process exited with code: ${code}`);
        console.log(`[BBCli] Full stdout:`, stdout);
        console.log(`[BBCli] Full stderr:`, stderr);
        
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`BB CLI failed with code ${code}. stderr: ${stderr}, stdout: ${stdout}`));
        }
      });

      process.on('error', (error) => {
        console.error(`[BBCli] Process spawn error:`, error);
        reject(new Error(`Failed to spawn BB CLI: ${error.message}`));
      });
    });
  }

  private async mkdir(dir: string): Promise<void> {
    console.log(`[BBCli] Creating directory: ${dir}`);
    
    return new Promise((resolve, reject) => {
      const process = spawn('mkdir', ['-p', dir]);
      
      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      process.on('close', (code) => {
        console.log(`[BBCli] mkdir exited with code: ${code}`);
        if (stderr) console.log(`[BBCli] mkdir stderr: ${stderr}`);
        if (stdout) console.log(`[BBCli] mkdir stdout: ${stdout}`);
        
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Failed to create directory: ${dir}. Code: ${code}, stderr: ${stderr}`));
        }
      });
      
      process.on('error', (error) => {
        console.error(`[BBCli] mkdir spawn error:`, error);
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