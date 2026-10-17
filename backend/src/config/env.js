import 'dotenv/config';
export const config = {
 port: Number(process.env.PORT || 3000), production: process.env.NODE_ENV === 'production',
 origin: process.env.APP_ORIGIN || 'http://localhost:3000',
 secret: process.env.JWT_SECRET || '', mlUrl: process.env.ML_URL || (process.env.ML_HOSTPORT ? 'http://' + process.env.ML_HOSTPORT : 'http://127.0.0.1:8000'),
 mlKey: process.env.ML_API_KEY || '', registration: process.env.ALLOW_REGISTRATION === 'true'
};
export function validateConfig() {
 if (config.secret.length < 32 || config.secret.startsWith('replace-')) throw new Error('Set JWT_SECRET to a random secret of at least 32 characters.');
 if (config.production && !config.origin.startsWith('https://')) throw new Error('APP_ORIGIN must use HTTPS in production.');
}
