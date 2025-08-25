import { CompiledCircuit, InputMap } from '@noir-lang/noir_js';
import { ProofData } from '@noir-lang/types';
import { BBCli } from './bbCli';

export async function generateProof(
    circuit: CompiledCircuit,
    input: InputMap,
    bbCli: BBCli
): Promise<ProofData> {
    try {
        return await bbCli.generateProof(circuit, input);
    } catch (error) {
        console.error('Error generating proof with BB CLI:', error);
        console.log('Proof generation failed with Inputs:', input);
        throw error;
    }
}