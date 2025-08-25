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

  setMockProof(proof: any) {
    this.mockProof = proof;
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

  describe('Parameter Validation', () => {
    it('should return 400 when request body is missing', async () => {
      const response = await request(app)
        .post('/prove')
        .send();

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid request body. Expected circuit (CompiledCircuit) and input (InputMap) parameters.');
    });

    it('should return 400 when circuit parameter is missing', async () => {
      const response = await request(app)
        .post('/prove')
        .send({ input: { x: 1 } });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid request body. Expected circuit (CompiledCircuit) and input (InputMap) parameters.');
    });

    it('should return 400 when input parameter is missing', async () => {
      const response = await request(app)
        .post('/prove')
        .send({ 
          circuit: { 
            bytecode: 'mock-bytecode',
            abi: { parameters: [] },
            debug_symbols: 'mock-debug',
            file_map: {}
          }
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid request body. Expected circuit (CompiledCircuit) and input (InputMap) parameters.');
    });

    it('should return 400 when circuit is not an object', async () => {
      const response = await request(app)
        .post('/prove')
        .send({ 
          circuit: 'not-an-object',
          input: { x: 1 }
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid request body. Expected circuit (CompiledCircuit) and input (InputMap) parameters.');
    });

    it('should return 400 when input is not an object', async () => {
      const response = await request(app)
        .post('/prove')
        .send({ 
          circuit: { bytecode: 'mock-bytecode' },
          input: 'not-an-object'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid request body. Expected circuit (CompiledCircuit) and input (InputMap) parameters.');
    });

    it('should return 400 when circuit.bytecode is missing', async () => {
      const response = await request(app)
        .post('/prove')
        .send({ 
          circuit: { notBytecode: 'value' },
          input: { x: 1 }
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid request body. Expected circuit (CompiledCircuit) and input (InputMap) parameters.');
    });

    it('should return 400 when circuit.bytecode is not a string', async () => {
      const response = await request(app)
        .post('/prove')
        .send({ 
          circuit: { 
            bytecode: 123,
            abi: { parameters: [] },
            debug_symbols: 'mock-debug',
            file_map: {}
          },
          input: { x: 1 }
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid request body. Expected circuit (CompiledCircuit) and input (InputMap) parameters.');
    });

    it('should return 400 when circuit.abi is missing', async () => {
      const response = await request(app)
        .post('/prove')
        .send({ 
          circuit: { 
            bytecode: 'valid-bytecode',
            debug_symbols: 'mock-debug',
            file_map: {}
          },
          input: { x: 1 }
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid request body. Expected circuit (CompiledCircuit) and input (InputMap) parameters.');
    });

    it('should return 400 when circuit.abi.parameters is not an array', async () => {
      const response = await request(app)
        .post('/prove')
        .send({ 
          circuit: { 
            bytecode: 'valid-bytecode',
            abi: { parameters: 'not-an-array' },
            debug_symbols: 'mock-debug',
            file_map: {}
          },
          input: { x: 1 }
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid request body. Expected circuit (CompiledCircuit) and input (InputMap) parameters.');
    });

    it('should return 400 when circuit.debug_symbols is missing', async () => {
      const response = await request(app)
        .post('/prove')
        .send({ 
          circuit: { 
            bytecode: 'valid-bytecode',
            abi: { parameters: [] },
            file_map: {}
          },
          input: { x: 1 }
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid request body. Expected circuit (CompiledCircuit) and input (InputMap) parameters.');
    });

    it('should return 400 when circuit.debug_symbols is not a string', async () => {
      const response = await request(app)
        .post('/prove')
        .send({ 
          circuit: { 
            bytecode: 'valid-bytecode',
            abi: { parameters: [] },
            debug_symbols: 123,
            file_map: {}
          },
          input: { x: 1 }
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid request body. Expected circuit (CompiledCircuit) and input (InputMap) parameters.');
    });

    it('should return 400 when circuit.file_map is missing', async () => {
      const response = await request(app)
        .post('/prove')
        .send({ 
          circuit: { 
            bytecode: 'valid-bytecode',
            abi: { parameters: [] },
            debug_symbols: 'mock-debug'
          },
          input: { x: 1 }
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid request body. Expected circuit (CompiledCircuit) and input (InputMap) parameters.');
    });

    it('should return 400 when circuit.file_map is not an object', async () => {
      const response = await request(app)
        .post('/prove')
        .send({ 
          circuit: { 
            bytecode: 'valid-bytecode',
            abi: { parameters: [] },
            debug_symbols: 'mock-debug',
            file_map: 'not-an-object'
          },
          input: { x: 1 }
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid request body. Expected circuit (CompiledCircuit) and input (InputMap) parameters.');
    });
  });

  describe('Successful Proof Generation', () => {
    it('should return 200 and proof data when valid parameters are provided', async () => {
      const validRequest = {
        circuit: { 
          bytecode: 'valid-bytecode',
          abi: { parameters: [] },
          debug_symbols: 'mock-debug-symbols',
          file_map: {}
        },
        input: { x: 42, y: 10 }
      };

      const expectedProof = { 
        proof: 'generated-proof-data', 
        publicInputs: [42, 52] 
      };
      mockProofService.setMockProof(expectedProof);

      const response = await request(app)
        .post('/prove')
        .send(validRequest);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Proof generated successfully');
      expect(response.body.proof).toEqual(expectedProof);
    });

    it('should accept complex circuit and input objects', async () => {
      const complexRequest = {
        circuit: {
          bytecode: 'complex-bytecode-with-more-data',
          abi: {
            parameters: [
              { name: 'x', type: { kind: 'integer', width: 32 } },
              { name: 'y', type: { kind: 'integer', width: 32 } }
            ]
          },
          debug_symbols: 'complex-debug-symbols-encoded',
          file_map: {
            0: { source: 'fn main() {}', path: 'main.nr' },
            1: { source: 'use dep::std;', path: 'lib.nr' }
          }
        },
        input: { 
          x: 100, 
          y: 200, 
          nested: { value: 'test' },
          array: [1, 2, 3]
        }
      };

      const response = await request(app)
        .post('/prove')
        .send(complexRequest);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Proof generated successfully');
    });
  });

  describe('Error Handling', () => {
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
      expect(response.body.details).toBe('Mock proof generation failed');
    });

    it('should handle unknown errors gracefully', async () => {
      mockProofService.generateProof = async () => {
        throw 'String error instead of Error object';
      };

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
      expect(response.body.details).toBe('Unknown error');
    });
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

  it('should return false for null/undefined', () => {
    expect(validateProveRequest(null)).toBe(false);
    expect(validateProveRequest(undefined)).toBe(false);
  });

  it('should return false for non-object', () => {
    expect(validateProveRequest('string')).toBe(false);
    expect(validateProveRequest(123)).toBe(false);
  });

  it('should return false when circuit is missing', () => {
    expect(validateProveRequest({ input: {} })).toBe(false);
  });

  it('should return false when input is missing', () => {
    expect(validateProveRequest({ 
      circuit: { 
        bytecode: 'test',
        abi: { parameters: [] },
        debug_symbols: 'mock-debug',
        file_map: {}
      } 
    })).toBe(false);
  });

  it('should return false when circuit.bytecode is missing', () => {
    expect(validateProveRequest({ 
      circuit: { 
        notBytecode: 'test',
        abi: { parameters: [] },
        debug_symbols: 'mock-debug',
        file_map: {}
      }, 
      input: {} 
    })).toBe(false);
  });

  it('should return false when circuit.bytecode is not a string', () => {
    expect(validateProveRequest({ 
      circuit: { 
        bytecode: 123,
        abi: { parameters: [] },
        debug_symbols: 'mock-debug',
        file_map: {}
      }, 
      input: {} 
    })).toBe(false);
  });

  it('should return false when circuit.abi is missing', () => {
    expect(validateProveRequest({ 
      circuit: { 
        bytecode: 'test',
        debug_symbols: 'mock-debug',
        file_map: {}
      }, 
      input: {} 
    })).toBe(false);
  });

  it('should return false when circuit.abi.parameters is not an array', () => {
    expect(validateProveRequest({ 
      circuit: { 
        bytecode: 'test',
        abi: { parameters: 'not-array' },
        debug_symbols: 'mock-debug',
        file_map: {}
      }, 
      input: {} 
    })).toBe(false);
  });

  it('should return false when circuit.debug_symbols is missing', () => {
    expect(validateProveRequest({ 
      circuit: { 
        bytecode: 'test',
        abi: { parameters: [] },
        file_map: {}
      }, 
      input: {} 
    })).toBe(false);
  });

  it('should return false when circuit.debug_symbols is not a string', () => {
    expect(validateProveRequest({ 
      circuit: { 
        bytecode: 'test',
        abi: { parameters: [] },
        debug_symbols: 123,
        file_map: {}
      }, 
      input: {} 
    })).toBe(false);
  });

  it('should return false when circuit.file_map is missing', () => {
    expect(validateProveRequest({ 
      circuit: { 
        bytecode: 'test',
        abi: { parameters: [] },
        debug_symbols: 'mock-debug'
      }, 
      input: {} 
    })).toBe(false);
  });

  it('should return false when circuit.file_map is not an object', () => {
    expect(validateProveRequest({ 
      circuit: { 
        bytecode: 'test',
        abi: { parameters: [] },
        debug_symbols: 'mock-debug',
        file_map: 'not-object'
      }, 
      input: {} 
    })).toBe(false);
  });
});