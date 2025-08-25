import express, { Request, Response } from 'express';

const app = express();
const port = 3000;

app.use(express.json());

app.post('/prove', (req: Request, res: Response) => {
  console.log('Received a request to /prove');
  console.log('Body:', req.body);
  res.status(200).json({ message: 'Proof received', data: req.body });
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
