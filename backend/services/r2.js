const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const requiredEnvVars = [
  'R2_BUCKET',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_ENDPOINT'
];

const getMissingEnvVars = () => requiredEnvVars.filter((name) => !process.env[name]);

const isR2Configured = () => getMissingEnvVars().length === 0;

let r2Client;

const getR2Client = () => {
  const missingEnvVars = getMissingEnvVars();

  if (missingEnvVars.length > 0) {
    throw new Error(`Missing required R2 env vars: ${missingEnvVars.join(', ')}`);
  }

  if (!r2Client) {
    r2Client = new S3Client({
      endpoint: process.env.R2_ENDPOINT,
      region: 'auto',
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
      }
    });
  }

  return r2Client;
};

const putObject = async ({ key, body, contentType }) => {
  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET,
    Key: key,
    Body: body,
    ContentType: contentType
  });

  await getR2Client().send(command);

  return { key, bucket: process.env.R2_BUCKET };
};

const getSignedDownloadUrl = async ({ key, expiresInSeconds = 60 * 10 }) => {
  const command = new GetObjectCommand({
    Bucket: process.env.R2_BUCKET,
    Key: key
  });

  return getSignedUrl(getR2Client(), command, { expiresIn: expiresInSeconds });
};

const getSignedUploadUrl = async ({ key, contentType, expiresInSeconds = 60 * 10 }) => {
  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET,
    Key: key,
    ContentType: contentType
  });

  return getSignedUrl(getR2Client(), command, { expiresIn: expiresInSeconds });
};

// Backward-compatible aliases for existing callers.
const uploadBuffer = async ({ key, buffer, contentType }) => putObject({ key, body: buffer, contentType });
const getDownloadUrl = async (key, expiresInSeconds) => getSignedDownloadUrl({ key, expiresInSeconds });

module.exports = {
  isR2Configured,
  putObject,
  getSignedDownloadUrl,
  getSignedUploadUrl,
  uploadBuffer,
  getDownloadUrl
};
