require('dotenv').config({ path: `${__dirname}/../.env` });
console.log('ZERNIO KEY CHECK:', process.env.ZERNIO_API_KEY);

const API_KEY_ENV_NAME = 'ZERNIO_API_KEY';

class ZernioService {
  getApiKey() {
    return (process.env[API_KEY_ENV_NAME] || '').trim();
  }

  ensureConfigured() {
    if (!this.getApiKey()) {
      const error = new Error(`Missing ${API_KEY_ENV_NAME}. Set it in backend/.env to enable Zernio features.`);
      error.status = 503;
      throw error;
    }
  }

  async connectAccount({ businessId, platform, accountHandle }) {
    this.ensureConfigured();

    return {
      businessId,
      platform,
      accountHandle,
      status: 'connected',
      connectedAt: new Date().toISOString(),
    };
  }

  async createPost({ businessId, content, platforms = [] }) {
    this.ensureConfigured();

    return {
      id: `zernio-${Date.now()}`,
      businessId,
      content,
      platforms,
      status: 'queued',
      createdAt: new Date().toISOString(),
    };
  }

  async getPostHistory({ businessId }) {
    this.ensureConfigured();

    return [
      {
        id: `sample-${businessId}`,
        businessId,
        content: 'Your Zernio post history will appear here once publishing is enabled.',
        platforms: [],
        status: 'info',
        createdAt: new Date().toISOString(),
      },
    ];
  }
}

module.exports = new ZernioService();
