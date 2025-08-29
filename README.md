# BB Service

A simple HTTP wrapper around the Aztec BB CLI tool for systems that don't have GLIBC>=2.38.

## Why?

The Aztec BB CLI requires GLIBC>=2.38, which isn't available on older systems. This service runs BB in a Docker container and exposes it via HTTP, making it accessible from any system.

## Usage

```bash
# Start the service
docker-compose up

# Generate a proof
curl -X POST http://localhost:3000/prove \
  -H "Content-Type: application/json" \
  -d '{"circuit": "your_circuit_data"}'
```

## API

- `GET /health` - Health check
- `POST /prove` - Generate proof using BB CLI
- `POST /verify` - Verify proof using BB CLI

### Request/Response Schemas

#### `GET /health`

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-08-29T10:30:00.000Z",
  "service": "bb-service"
}
```

#### `POST /prove`

**Request:**
```json
{
  "circuit": [See Noir circuit artifacts],
  "input": {
    "input_param": [1, 2, 3, 4]
  }
}
```

**Success Response (200):**
```json
{
  "message": "Proof generated successfully",
  "proof": {
    "proof": [12, 34, 56, 78, ...],
    "publicInputs": []
  }
}
```

#### `POST /verify`

**Request:**
```json
{
  "circuit": [See Noir circuit artifacts],
  "proof": {
    "proof": [12, 34, 56, 78, ...],
    "publicInputs": []
  }
}
```

**Success Response (200):**
```json
{
  "message": "Proof verification completed",
  "isValid": true
}
```

## Development

```bash
yarn install
yarn dev        # Development server
yarn test       # Run tests
yarn build      # Build TypeScript
```