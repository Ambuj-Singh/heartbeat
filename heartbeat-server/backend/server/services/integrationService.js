const config = require("../config/env");
const logger = require("./logger");
const { createAuditLog } = require("./auditLogService");

function getIntegrationStatus() {
  return {
    enabled: config.outboundNotificationsEnabled,
    slack: {
      configured: Boolean(config.slackWebhookUrl)
    },
    webhook: {
      configured: Boolean(config.genericWebhookUrl)
    }
  };
}

async function postWebhook(target, url, payload) {
  if (!url) {
    return {
      target,
      ok: false,
      skipped: true,
      reason: "not_configured"
    };
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Webhook request failed with status ${response.status}.`);
    }

    return {
      target,
      ok: true,
      skipped: false
    };
  } catch (error) {
    logger.warn({ err: error, target }, "Outbound webhook delivery failed");
    return {
      target,
      ok: false,
      skipped: false,
      reason: error.message || "delivery_failed"
    };
  }
}

function buildSlackPayload(title, details = {}) {
  return {
    text: title,
    attachments: [
      {
        color: details.severity === "CRITICAL" ? "#ff6b7d" : "#49b3ff",
        fields: Object.entries(details)
          .filter(([, value]) => value !== undefined && value !== null && value !== "")
          .map(([key, value]) => ({
            title: key,
            value: String(value),
            short: true
          }))
      }
    ]
  };
}

async function auditOutboundNotification(action, metadata) {
  try {
    await createAuditLog({
      actor: "system",
      actorRole: "ADMIN",
      action,
      resourceType: "INTEGRATION",
      resourceId: metadata?.resourceId || null,
      metadata
    });
  } catch (error) {
    logger.warn({ err: error, action }, "Failed to write outbound integration audit log");
  }
}

async function dispatchIntegrations(eventType, payload, auditMetadata = {}) {
  const status = getIntegrationStatus();

  if (!status.enabled) {
    return {
      sent: false,
      reason: "disabled",
      targets: []
    };
  }

  const [slackResult, webhookResult] = await Promise.all([
    postWebhook(
      "slack",
      config.slackWebhookUrl,
      buildSlackPayload(payload.title || eventType, {
        severity: payload.severity,
        node: payload.node,
        cluster: payload.cluster,
        service: payload.service,
        region: payload.region,
        environment: payload.environment,
        status: payload.status,
        message: payload.message
      })
    ),
    postWebhook("webhook", config.genericWebhookUrl, {
      eventType,
      timestamp: new Date().toISOString(),
      payload
    })
  ]);

  await auditOutboundNotification("OUTBOUND_NOTIFICATION_SENT", {
    ...auditMetadata,
    eventType,
    targets: [slackResult, webhookResult]
  });

  return {
    sent: true,
    targets: [slackResult, webhookResult]
  };
}

async function notifyCriticalAlert(alert) {
  return dispatchIntegrations(
    "ALERT_CRITICAL",
    {
      title: `Critical alert: ${alert?.node || "system"}`,
      severity: alert?.severity,
      message: alert?.message,
      node: alert?.node,
      cluster: alert?.cluster,
      service: alert?.service,
      region: alert?.region,
      environment: alert?.environment,
      status: alert?.type
    },
    {
      resourceId: alert?._id || null,
      alertType: alert?.type
    }
  );
}

async function notifyIncidentCreated(incident) {
  return dispatchIntegrations(
    "INCIDENT_CREATED",
    {
      title: `Incident created for ${incident?.node || "unknown node"}`,
      severity: "CRITICAL",
      message: `Node ${incident?.node || "unknown"} entered incident state.`,
      node: incident?.node,
      cluster: incident?.cluster,
      service: incident?.service,
      region: incident?.region,
      environment: incident?.environment,
      status: incident?.status
    },
    {
      resourceId: incident?._id || null,
      incidentStatus: incident?.status
    }
  );
}

async function notifyIncidentResolved(incident) {
  return dispatchIntegrations(
    "INCIDENT_RESOLVED",
    {
      title: `Incident resolved for ${incident?.node || "unknown node"}`,
      severity: "HIGH",
      message: `Node ${incident?.node || "unknown"} recovered successfully.`,
      node: incident?.node,
      cluster: incident?.cluster,
      service: incident?.service,
      region: incident?.region,
      environment: incident?.environment,
      status: incident?.status
    },
    {
      resourceId: incident?._id || null,
      incidentStatus: incident?.status
    }
  );
}

async function testIntegrations(target = "all", user = null) {
  const safeTarget = ["slack", "webhook", "all"].includes(target) ? target : "all";
  const status = getIntegrationStatus();
  const tasks = [];

  if (safeTarget === "all" || safeTarget === "slack") {
    tasks.push(
      postWebhook(
        "slack",
        config.slackWebhookUrl,
        buildSlackPayload("Heartbeat integration test", {
          severity: "LOW",
          message: `Triggered by ${user?.username || "system"}.`,
          status: "TEST"
        })
      )
    );
  }

  if (safeTarget === "all" || safeTarget === "webhook") {
    tasks.push(
      postWebhook("webhook", config.genericWebhookUrl, {
        eventType: "INTEGRATION_TEST",
        timestamp: new Date().toISOString(),
        payload: {
          actor: user?.username || "system"
        }
      })
    );
  }

  const results = await Promise.all(tasks);

  await auditOutboundNotification("OUTBOUND_NOTIFICATION_TESTED", {
    actor: user?.username || "system",
    requestedTarget: safeTarget,
    configured: status,
    results
  });

  return {
    status,
    results
  };
}

module.exports = {
  getIntegrationStatus,
  notifyCriticalAlert,
  notifyIncidentCreated,
  notifyIncidentResolved,
  testIntegrations
};
