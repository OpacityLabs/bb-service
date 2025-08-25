import express, { Express, Request, Response } from 'express';
import { CompiledCircuit, InputMap } from '@noir-lang/noir_js';
import { generateProof } from './generateProof';
import { BBCli, DefaultBBCli } from './bbCli';

export interface ProveRequest {
  circuit: CompiledCircuit;
  input: InputMap;
}

export interface ProofService {
  generateProof(circuit: CompiledCircuit, input: InputMap): Promise<any>;
}

export interface Dependencies {
  proofService: ProofService;
  bbCli: BBCli;
}

export class DefaultProofService implements ProofService {
  constructor(private bbCli: BBCli) {}

  async generateProof(circuit: CompiledCircuit, input: InputMap): Promise<any> {
    return generateProof(circuit, input, this.bbCli);
  }
}

export { BBCli, DefaultBBCli } from './bbCli';

export function validateProveRequest(body: any): body is ProveRequest {
  if (!body || typeof body !== 'object') {
    return false;
  }
  
  if (!body.circuit || typeof body.circuit !== 'object') {
    return false;
  }
  
  if (!body.input || typeof body.input !== 'object') {
    return false;
  }
  
  // Validate bytecode
  if (!body.circuit.bytecode || typeof body.circuit.bytecode !== 'string') {
    return false;
  }
  
  // Validate abi
  if (!body.circuit.abi || typeof body.circuit.abi !== 'object') {
    return false;
  }
  
  // Validate abi structure
  if (!Array.isArray(body.circuit.abi.parameters)) {
    return false;
  }
  
  // Validate debug_symbols
  if (!body.circuit.debug_symbols || typeof body.circuit.debug_symbols !== 'string') {
    return false;
  }
  
  // Validate file_map
  if (!body.circuit.file_map || typeof body.circuit.file_map !== 'object') {
    return false;
  }
  
  return true;
}

export function createApp(dependencies: Dependencies): Express {
  const app = express();
  app.use(express.json({ limit: '10mb' })); // Increase limit for large circuit files

  app.post('/prove', async (req: Request, res: Response) => {
    console.log('Received a request to /prove');
    
    if (!validateProveRequest(req.body)) {
      return res.status(400).json({ 
        error: 'Invalid request body. Expected circuit (CompiledCircuit) and input (InputMap) parameters.' 
      });
    }
    
    const { circuit, input } = req.body;
    
    try {
      const proof = await dependencies.proofService.generateProof(circuit, input);
      res.status(200).json({ 
        message: 'Proof generated successfully', 
        proof: proof 
      });
    } catch (error) {
      console.error('Error generating proof:', error);
      res.status(500).json({ 
        error: 'Failed to generate proof', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  return app;
}

if (require.main === module) {
  const bbCli = new DefaultBBCli();
  const dependencies: Dependencies = {
    proofService: new DefaultProofService(bbCli),
    bbCli: bbCli
  };
  
  const app = createApp(dependencies);
  const port = 3000;
  
  app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
  });
}
