import request from 'supertest';
import { Express } from 'express';
import { createApp, Dependencies, ProofService, validateProveRequest } from '../src/index';
import { CompiledCircuit, InputMap } from '@noir-lang/noir_js';

class MockProofService implements ProofService {
  private shouldFail: boolean = false;
  private mockProof: any = { proof: 'mock-proof-data', publicInputs: [] };

  async generateProof(circuit: CompiledCircuit, input: InputMap): Promise<any> {
    if (this.shouldFail) {
      throw new Error('Mock proof generation failed');
    }
    return this.mockProof;
  }

  setShouldFail(shouldFail: boolean) {
    this.shouldFail = shouldFail;
  }
}

describe('Prove Endpoint', () => {
  let app: Express;
  let mockProofService: MockProofService;

  beforeEach(() => {
    mockProofService = new MockProofService();
    const dependencies: Dependencies = {
      proofService: mockProofService
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
    mockProofService.setShouldFail(true);

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