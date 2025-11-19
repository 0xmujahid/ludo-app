import { Request, Response, NextFunction } from 'express';

const snakeToLowerUnderscore = (obj: any) => {
  return Object.fromEntries(
    Object.entries(obj).map(([key, value]) => [
      key.replace(/([A-Z])/g, '_$1').toLowerCase(),
      value,
    ])
  );
};

export const convertRequestBody = (req: Request, res: Response, next: NextFunction) => {
  req.body = snakeToLowerUnderscore(req.body);
  next();
};

export const convertResponseBody = (data: any) => {
  return snakeToLowerUnderscore(data);
};

// Middleware to convert response data from lower_underscore_case to snake_case
export const lowerUnderscoreToSnakeMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const originalSend = res.send.bind(res);
  res.send = (body: any) => {
    if (typeof body === 'object') {
      body = toSnakeCase(body);
    }
    return originalSend(body);
  };
};

// Helper function to convert lower_underscore_case to snake_case
const toSnakeCase = (obj: any) => {
  const newObj: any = {};
  for (const key in obj) {
    const newKey = key.replace(/([A-Z])/g, (matches) => '_' + matches.toLowerCase());
    newObj[newKey] = obj[key];
  }
  return newObj;
};
