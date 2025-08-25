import { UltraHonkBackend, ProofData } from '@aztec/bb.js';
import { Noir, CompiledCircuit, InputMap } from '@noir-lang/noir_js';

export async function generateProof(
    circuit: CompiledCircuit,
    input: InputMap
): Promise<ProofData> {
    let noir: Noir | null = null;
    let backend: UltraHonkBackend | null = null;
    try {
        noir = new Noir(circuit as CompiledCircuit);
        backend = new UltraHonkBackend(circuit.bytecode);
    } catch (error) {
        console.error('Error initializing Noir:', error);
    }

    if (!noir || !backend) {
        throw new Error('Failed to initialize Noir or backend');
    }

    let witness: Uint8Array;
    try {
        const data = await noir.execute(input);
        witness = data.witness;
    } catch (error) {
        console.error('Error executing Noir circuit:', error);
        console.log('Proof generation failed with Inputs:', input);
        throw error;
    }

    return await backend.generateProof(witness, { keccak: true });
}