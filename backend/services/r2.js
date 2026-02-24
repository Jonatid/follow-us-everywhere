const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const requiredEnvVars = [
  'R2_BUCKET',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_ENDPOINT'
];

const getMissingEnvVars = () => requiredEnvVars.filter((name) => !process.env[name]);

let r2Client;

const getR2Client = () => {
  const missingEnvVars = getMissingEnvVars();

  if (missingEnvVars.length > 0) {
    throw new Error(`Missing required R2 env vars: ${missingEnvVars.join(', ')}`);
  }

  if (!r2Client) {
    r2Client = new S3Client({
      region: 'auto',
      endpoint: process.env.R2_ENDPOINT,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
      }
    });
  }

  return r2Client;
};

const uploadBuffer = async ({ key, buffer, contentType }) => {
  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    ACL: 'private'
  });

  await getR2Client().send(command);

  return { key, bucket: process.env.R2_BUCKET };
};

const getDownloadUrl = async (key, expiresInSeconds = 60 * 10) => {
  const command = new GetObjectCommand({
    Bucket: process.env.R2_BUCKET,
    Key: key
  });

  return getSignedUrl(getR2Client(), command, { expiresIn: expiresInSeconds });
};

module.exports = {
  uploadBuffer,
  getDownloadUrl
};
