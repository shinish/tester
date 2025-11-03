import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { launchJobTemplate } from '@/lib/awx-api';
import yaml from 'js-yaml';
import { generateUniqueRunId } from '@/lib/runIdGenerator';

/**
 * Get AWX configuration from environment variables or database
 * Priority: Environment variables > Database settings > Defaults
 */
async function getAwxConfig() {
  let baseUrl = process.env.AWX_BASE_URL || '';
  let token = process.env.AWX_TOKEN || '';

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

// POST /api/automations/[id]/run - Execute an automation
export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { parameters, reservedTaskId } = body;

    // Fetch the automation details
    const automation = await prisma.automation.findUnique({
      where: { id },
    });

    if (!automation) {
      return NextResponse.json({ error: 'Automation not found' }, { status: 404 });
    }

    // Get user information
    const executedBy = body.user?.name || body.user?.email || 'System';

    // Use pre-reserved Task ID if provided, otherwise generate a new one
    const uniqueId = reservedTaskId || await generateUniqueRunId(body.user);

    // Create a run record
    const run = await prisma.run.create({
      data: {
        automationId: automation.id,
        status: 'running',
        uniqueId: uniqueId,
        executedBy: executedBy,
        parameters: JSON.stringify(parameters || {}),
      },
    });

    try {
      // Parse extra vars template and replace with form values
      let extraVars = {};
      if (automation.extraVars) {
        try {
          // Parse YAML
          extraVars = yaml.load(automation.extraVars);

          // Replace template variables with actual values from parameters
          const replacedVars = {};
          for (const [key, value] of Object.entries(extraVars)) {
            if (typeof value === 'string') {
              // Replace {{form.key}} with actual values
              let replaced = value;
              const regex = /\{\{form\.(\w+)\}\}/g;
              replaced = value.replace(regex, (match, fieldName) => {
                return parameters[fieldName] || match;
              });
              replacedVars[key] = replaced;
            } else {
              replacedVars[key] = value;
            }
          }
          extraVars = replacedVars;
        } catch (yamlError) {
          console.error('Error parsing YAML:', yamlError);
        }
      }

      // Fetch proxy settings
      const proxySettings = await fetchProxySettings();

      // Fetch AWX base URL from global settings
      const awxConfig = await getAwxConfig();

      // Generate curl command for display
      const curlCommand = generateCurlCommand(
        awxConfig.baseUrl,
        automation.templateId,
        automation.inventoryId,
        extraVars,
        proxySettings
      );

      // Launch AWX job template
      const awxResponse = await launchJobTemplate(
        automation.templateId,
        automation.inventoryId,
        extraVars
      );

      // Update run with AWX job ID and success status
      await prisma.run.update({
        where: { id: run.id },
        data: {
          awxJobId: awxResponse.id?.toString(),
          status: 'success',
          result: JSON.stringify(awxResponse),
          completedAt: new Date(),
        },
      });

      // Increment automation runs counter
      await prisma.automation.update({
        where: { id: automation.id },
        data: {
          runs: { increment: 1 },
        },
      });

      // Create activity log for automation execution
      await prisma.activity.create({
        data: {
          action: 'executed',
          entityType: 'automation',
          entityId: automation.id,
          entityName: automation.name,
          description: `Executed automation "${automation.name}" (${uniqueId}) with AWX Job ID: ${awxResponse.id}`,
          performedBy: body.user?.email || 'system',
          metadata: JSON.stringify({
            runId: run.id,
            uniqueId: uniqueId,
            awxJobId: awxResponse.id,
            parameters: parameters,
            status: 'success',
          }),
        },
      });

      return NextResponse.json({
        success: true,
        runId: run.id,
        uniqueId: uniqueId,
        awxJobId: awxResponse.id,
        message: 'Automation started successfully',
        curlCommand: curlCommand,
        parameters: parameters,
        extraVars: extraVars,
      });
    } catch (awxError) {
      // Update run with failed status
      await prisma.run.update({
        where: { id: run.id },
        data: {
          status: 'failed',
          errorMessage: awxError.message,
          completedAt: new Date(),
        },
      });

      // Create activity log for failed execution
      await prisma.activity.create({
        data: {
          action: 'executed',
          entityType: 'automation',
          entityId: automation.id,
          entityName: automation.name,
          description: `Failed to execute automation "${automation.name}" (${uniqueId}): ${awxError.message}`,
          performedBy: body.user?.email || 'system',
          metadata: JSON.stringify({
            runId: run.id,
            uniqueId: uniqueId,
            parameters: parameters,
            status: 'failed',
            error: awxError.message,
          }),
        },
      });

      return NextResponse.json(
        {
          error: 'Failed to execute automation',
          details: awxError.message,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error running automation:', error);
    return NextResponse.json({ error: 'Failed to run automation' }, { status: 500 });
  }
}

/**
 * Fetch proxy settings from database
 * @returns {Promise<object>} - Proxy settings
 */
async function fetchProxySettings() {
  try {
    const proxyEnabled = await prisma.setting.findUnique({
      where: { key: 'proxy_enabled' },
    });
    const proxyUrl = await prisma.setting.findUnique({
      where: { key: 'proxy_url' },
    });
    const proxyPort = await prisma.setting.findUnique({
      where: { key: 'proxy_port' },
    });

    return {
      enabled: proxyEnabled?.value === 'true',
      url: proxyUrl?.value || '',
      port: proxyPort?.value || '',
    };
  } catch (error) {
    console.error('Error fetching proxy settings:', error);
    return { enabled: false, url: '', port: '' };
  }
}

/**
 * Generate curl command for AWX API call
 * @param {string} baseUrl - AWX base URL
 * @param {string} templateId - Job template ID
 * @param {string} inventoryId - Inventory ID
 * @param {object} extraVars - Extra variables
 * @param {object} proxySettings - Proxy settings
 * @returns {string} - Formatted curl command
 */
function generateCurlCommand(baseUrl, templateId, inventoryId, extraVars, proxySettings = {}) {
  const url = `${baseUrl}/job_templates/${templateId}/launch/`;
  const token = process.env.AWX_TOKEN || '<YOUR_AWX_TOKEN>';

  const payload = {
    inventory: inventoryId,
    extra_vars: extraVars,
  };

  // Build curl command with optional proxy
  let curlCommand = `curl -X POST '${url}' \\`;

  // Add proxy if enabled
  if (proxySettings.enabled && proxySettings.url && proxySettings.port) {
    curlCommand += `\n  -x '${proxySettings.url}:${proxySettings.port}' \\`;
  }

  curlCommand += `
  -H 'Authorization: Bearer ${token}' \\
  -H 'Content-Type: application/json' \\
  -d '${JSON.stringify(payload, null, 2)}'`;

  return curlCommand;
}
