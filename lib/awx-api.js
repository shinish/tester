import axios from 'axios';
import prisma from './prisma';

const AWX_BASE_URL = process.env.AWX_BASE_URL || 'https://awx.example.com/api/v2';
const AWX_TOKEN = process.env.AWX_TOKEN || '';

/**
 * Get AWX configuration from environment variables or database
 * Priority: Environment variables > Database settings > Defaults
 */
async function getAwxConfig() {
  let baseUrl = AWX_BASE_URL || '';
  let token = AWX_TOKEN || '';

  // If environment variables are not set or empty, fetch from database
  if (!baseUrl || !token) {
    try {
      const [urlSetting, tokenSetting] = await Promise.all([
        prisma.setting.findUnique({ where: { key: 'default_api_endpoint' } }),
        prisma.setting.findUnique({ where: { key: 'awx_token' } }),
      ]);

      if (!baseUrl && urlSetting?.value) {
        baseUrl = urlSetting.value;
      }
      if (!token && tokenSetting?.value) {
        token = tokenSetting.value;
      }
    } catch (error) {
      console.error('Error fetching AWX config from database:', error);
    }
  }

  // Fallback to default if still not set
  if (!baseUrl) {
    baseUrl = 'https://awx.example.com/api/v2';
  }

  return { baseUrl, token };
}

const awxClient = axios.create({
  baseURL: AWX_BASE_URL,
  headers: {
    'Authorization': `Bearer ${AWX_TOKEN}`,
    'Content-Type': 'application/json',
  },
});

/**
 * Launch a job template in Ansible AWX
 * @param {string} templateId - The ID or name of the job template
 * @param {string} inventoryId - The inventory ID
 * @param {object} extraVars - Extra variables to pass to the job
 * @param {string} customBaseUrl - Optional custom AWX base URL
 * @param {string} customToken - Optional custom AWX token
 * @returns {Promise} - Job launch response
 */
export async function launchJobTemplate(templateId, inventoryId, extraVars = {}, customBaseUrl = null, customToken = null) {
  // Get AWX configuration (from env vars, database, or use provided custom values)
  let baseUrl = customBaseUrl;
  let token = customToken;

  if (!customBaseUrl || !customToken) {
    const config = await getAwxConfig();
    baseUrl = baseUrl || config.baseUrl;
    token = token || config.token;
  }

  // Demo mode: If AWX is not configured (no token or using default placeholder), return a mock response
  if (!token || baseUrl === 'https://awx.example.com/api/v2') {
    console.log('🎭 Demo Mode: AWX not configured, simulating successful job launch');
    console.log('Template ID:', templateId);
    console.log('Inventory ID:', inventoryId);
    console.log('Extra Vars:', JSON.stringify(extraVars, null, 2));

    // Return a mock successful response
    const mockJobId = Math.floor(Math.random() * 10000) + 1000;
    return {
      id: mockJobId,
      name: `Job ${mockJobId}`,
      status: 'successful',
      type: 'job',
      url: `/api/v2/jobs/${mockJobId}/`,
      created: new Date().toISOString(),
      started: new Date().toISOString(),
      finished: new Date(Date.now() + 5000).toISOString(),
      elapsed: 5.234,
      job_explanation: 'Demo mode - AWX not configured. This is a simulated successful execution.',
      execution_environment: null,
      job_template: templateId,
      inventory: inventoryId,
      extra_vars: JSON.stringify(extraVars),
    };
  }

  try {
    const client = customBaseUrl || customToken ? axios.create({
      baseURL: baseUrl,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }) : awxClient;

    const payload = {
      extra_vars: extraVars,
    };

    // Only add inventory if provided
    if (inventoryId) {
      payload.inventory = inventoryId;
    }

    const response = await client.post(`/job_templates/${templateId}/launch/`, payload);
    return response.data;
  } catch (error) {
    console.error('Error launching AWX job:', error.response?.data || error.message);
    throw new Error(`Failed to launch AWX job: ${error.response?.data?.detail || error.message}`);
  }
}

/**
 * Get job status from Ansible AWX
 * @param {string} jobId - The job ID
 * @returns {Promise} - Job status response
 */
export async function getJobStatus(jobId) {
  try {
    const response = await awxClient.get(`/jobs/${jobId}/`);
    return response.data;
  } catch (error) {
    console.error('Error fetching job status:', error.response?.data || error.message);
    throw new Error(`Failed to fetch job status: ${error.response?.data?.detail || error.message}`);
  }
}

/**
 * Get job output/logs from Ansible AWX
 * @param {string} jobId - The job ID
 * @returns {Promise} - Job output response
 */
export async function getJobOutput(jobId) {
  try {
    const response = await awxClient.get(`/jobs/${jobId}/stdout/?format=json`);
    return response.data;
  } catch (error) {
    console.error('Error fetching job output:', error.response?.data || error.message);
    throw new Error(`Failed to fetch job output: ${error.response?.data?.detail || error.message}`);
  }
}

/**
 * Cancel a running job in Ansible AWX
 * @param {string} jobId - The job ID
 * @returns {Promise} - Cancel response
 */
export async function cancelJob(jobId) {
  try {
    const response = await awxClient.post(`/jobs/${jobId}/cancel/`);
    return response.data;
  } catch (error) {
    console.error('Error canceling job:', error.response?.data || error.message);
    throw new Error(`Failed to cancel job: ${error.response?.data?.detail || error.message}`);
  }
}

/**
 * List job templates from Ansible AWX
 * @returns {Promise} - List of job templates
 */
export async function listJobTemplates() {
  try {
    const response = await awxClient.get('/job_templates/');
    return response.data.results;
  } catch (error) {
    console.error('Error listing job templates:', error.response?.data || error.message);
    throw new Error(`Failed to list job templates: ${error.response?.data?.detail || error.message}`);
  }
}

/**
 * List inventories from Ansible AWX
 * @returns {Promise} - List of inventories
 */
export async function listInventories() {
  try {
    const response = await awxClient.get('/inventories/');
    return response.data.results;
  } catch (error) {
    console.error('Error listing inventories:', error.response?.data || error.message);
    throw new Error(`Failed to list inventories: ${error.response?.data?.detail || error.message}`);
  }
}

export default {
  launchJobTemplate,
  getJobStatus,
  getJobOutput,
  cancelJob,
  listJobTemplates,
  listInventories,
};
