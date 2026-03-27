export type AllConfigType = {
  DB_HOST: string;
  DB_PORT: number;
  DB_USERNAME: string;
  DB_PASSWORD?: string;
  DB_DATABASE: string;

  NODE_ENV: 'development' | 'production';
};
