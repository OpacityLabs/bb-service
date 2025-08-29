import request from 'supertest';
import { Express } from 'express';
import { createApp, Dependencies, ProofService, validateProveRequest } from '../src/index';
import { CompiledCircuit, InputMap } from '@noir-lang/noir_js';
import { BBCli } from '../src/bbCli';

class MockBBCli implements BBCli {
  private shouldFail: boolean = false;
  private mockProof: any = { proof: new Uint8Array([1, 2, 3]), publicInputs: [] };

  async generateProof(circuit: CompiledCircuit, input: InputMap): Promise<any> {
    if (this.shouldFail) {
      throw new Error('Mock BB CLI proof generation failed');
    }
    return this.mockProof;
  }

  async verifyProof(circuit: CompiledCircuit, proof: any): Promise<boolean> {
    if (this.shouldFail) {
      throw new Error('Mock BB CLI proof verification failed');
    }
    return true; // Always return valid for mock
  }

  setShouldFail(shouldFail: boolean) {
    this.shouldFail = shouldFail;
  }
}

class MockProofService implements ProofService {
  constructor(private bbCli: BBCli) {}

  async generateProof(circuit: CompiledCircuit, input: InputMap): Promise<any> {
    return this.bbCli.generateProof(circuit, input);
  }
}

describe('Prove Endpoint', () => {
  let app: Express;
  let mockBBCli: MockBBCli;
  let mockProofService: MockProofService;

  beforeEach(() => {
    mockBBCli = new MockBBCli();
    mockProofService = new MockProofService(mockBBCli);
    const dependencies: Dependencies = {
      proofService: mockProofService,
      bbCli: mockBBCli
    };
    app = createApp(dependencies);
  });

  it('should return 400 for invalid request body', async () => {
    const response = await request(app)
      .post('/prove')
      .send({});

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Invalid request body. Expected circuit (CompiledCircuit) and input (InputMap) parameters.');
  });

  it('should return 400 for incomplete circuit', async () => {
    const response = await request(app)
      .post('/prove')
      .send({ 
        circuit: { bytecode: 'test' }, // missing required fields
        input: { x: 1 }
      });

    expect(response.status).toBe(400);
  });

  it('should return 200 for valid request', async () => {
    const validRequest = {
      circuit: { 
        bytecode: 'valid-bytecode',
        abi: { parameters: [] },
        debug_symbols: 'mock-debug-symbols',
        file_map: {}
      },
      input: { x: 42, y: 10 }
    };

    const response = await request(app)
      .post('/prove')
      .send(validRequest);

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Proof generated successfully');
    expect(response.body.proof).toBeDefined();
  });

  it('should return 500 when proof generation fails', async () => {
    mockBBCli.setShouldFail(true);

    const validRequest = {
      circuit: { 
        bytecode: 'valid-bytecode',
        abi: { parameters: [] },
        debug_symbols: 'mock-debug',
        file_map: {}
      },
      input: { x: 1 }
    };

    const response = await request(app)
      .post('/prove')
      .send(validRequest);

    expect(response.status).toBe(500);
    expect(response.body.error).toBe('Failed to generate proof');
    expect(response.body.details).toBe('Mock BB CLI proof generation failed');
  });

  it('should verify proof successfully', async () => {
    const validRequest = {
      circuit: { 
        bytecode: 'valid-bytecode',
        abi: { parameters: [] },
        debug_symbols: 'mock-debug',
        file_map: {}
      },
      proof: { proof: new Uint8Array([1, 2, 3]), publicInputs: [] }
    };

    const response = await request(app)
      .post('/verify')
      .send(validRequest);

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Proof verification completed');
    expect(response.body.isValid).toBe(true);
  });

  it('should return 400 for invalid verify request', async () => {
    const response = await request(app)
      .post('/verify')
      .send({});

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Invalid request body. Expected circuit (CompiledCircuit) and proof (ProofData) parameters.');
  });

  it('should return 500 when proof verification fails', async () => {
    mockBBCli.setShouldFail(true);

    const validRequest = {
      circuit: { 
        bytecode: 'valid-bytecode',
        abi: { parameters: [] },
        debug_symbols: 'mock-debug',
        file_map: {}
      },
      proof: { proof: new Uint8Array([1, 2, 3]), publicInputs: [] }
    };

    const response = await request(app)
      .post('/verify')
      .send(validRequest);

    expect(response.status).toBe(500);
    expect(response.body.error).toBe('Failed to verify proof');
    expect(response.body.details).toBe('Mock BB CLI proof verification failed');
  });
});

describe('validateProveRequest', () => {
  it('should return true for valid request', () => {
    const validRequest = {
      circuit: { 
        bytecode: 'test',
        abi: { parameters: [] },
        debug_symbols: 'mock-debug',
        file_map: {}
      },
      input: { x: 1 }
    };
    expect(validateProveRequest(validRequest)).toBe(true);
  });

  it('should return false for invalid request', () => {
    expect(validateProveRequest({})).toBe(false);
    expect(validateProveRequest({ circuit: { bytecode: 'test' } })).toBe(false);
  });
});