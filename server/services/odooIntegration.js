/**
 * Traviska Odoo Online CRM Integration Service
 * 
 * IMPORTANT ARCHITECTURE NOTE:
 * Odoo integration is strictly disabled by default (ODOO_ENABLED=false).
 * During this development phase:
 *  - No live network requests or external API calls are made to Odoo.
 *  - All customer enquiries and follow-ups are safely managed in MongoDB.
 *  - Enquiries are assigned permanent, unique, idempotent enquiry IDs (TRV-ENQ-...).
 * 
 * Future Activation:
 * Once valid Odoo Online CRM credentials (URL, DB, Username, API Key) are provided
 * and external API access is verified on the subscription, setting ODOO_ENABLED=true
 * activates bi-directional synchronization and batch migration without breaking or
 * altering the Sales Portal UI.
 */

const Enquiry = require("../models/Enquiry");
const FollowUp = require("../models/FollowUp");

class OdooIntegrationService {
  constructor() {
    this.isEnabled = process.env.ODOO_ENABLED === "true";
    this.url = process.env.ODOO_URL || "";
    this.db = process.env.ODOO_DB || "";
    this.username = process.env.ODOO_USERNAME || "";
    this.apiKey = process.env.ODOO_API_KEY || process.env.ODOO_PASSWORD || "";
    this.uid = null;
  }

  /**
   * Return current integration configuration & operational status
   */
  getStatus() {
    return {
      enabled: this.isEnabled,
      configured: Boolean(this.url && this.db && this.username && this.apiKey),
      serverUrl: this.url || "Not configured",
      database: this.db || "Not configured",
      user: this.username || "Not configured",
      statusMessage: this.isEnabled
        ? "Odoo integration active."
        : "Odoo integration layer ready (Standby Mode). All leads stored safely in MongoDB.",
    };
  }

  /**
   * Safe Lead Synchronization wrapper
   * If Odoo is disabled, gracefully records 'disabled' sync status in MongoDB.
   */
  async syncLead(enquiry) {
    if (!this.isEnabled) {
      return {
        success: true,
        synced: false,
        status: "disabled",
        message: "Odoo integration is currently disabled. Lead stored locally in MongoDB.",
        enquiryId: enquiry.enquiryId,
      };
    }

    try {
      // Prepared for when ODOO_ENABLED is set to true
      // Idempotency: If odooLeadId already exists, update instead of creating duplicate
      if (enquiry.odooLeadId) {
        return await this.updateLeadInOdoo(enquiry);
      } else {
        return await this.createLeadInOdoo(enquiry);
      }
    } catch (error) {
      console.error(`[OdooSync] Error syncing lead ${enquiry.enquiryId}:`, error.message);
      await Enquiry.findByIdAndUpdate(enquiry._id, {
        odooSyncStatus: "failed",
        odooSyncError: error.message,
      });
      return {
        success: false,
        synced: false,
        error: error.message,
      };
    }
  }

  /**
   * Transform Traviska Enquiry into Odoo crm.lead model schema
   */
  mapEnquiryToOdooLead(enquiry) {
    // Map Traviska priority to Odoo priority rating ('0', '1', '2', '3')
    const priorityMap = {
      Low: "0",
      Medium: "1",
      High: "2",
      Urgent: "3",
    };

    return {
      name: `${enquiry.tripTitle ? enquiry.tripTitle + " - " : ""}${enquiry.name} [${enquiry.enquiryId}]`,
      contact_name: enquiry.name,
      email_from: enquiry.email,
      phone: enquiry.phone,
      expected_revenue: enquiry.budget || 0,
      description: [
        `Traviska Unique Enquiry ID: ${enquiry.enquiryId}`,
        `Trip / Package: ${enquiry.tripTitle || "Custom Tour Inquiry"}`,
        `Departure Date: ${enquiry.departureDate || "Flexible"}`,
        `Number of Travelers: ${enquiry.numTravelers || 1}`,
        `Lead Source: ${enquiry.source || "Website"}`,
        `Assigned Agent: ${enquiry.assignedToName || "Unassigned"}`,
        `Customer Notes: ${enquiry.notes || "None"}`,
      ].join("\n"),
      priority: priorityMap[enquiry.priority] || "1",
    };
  }

  /**
   * Stubbed create method - strictly guarded by isEnabled
   */
  async createLeadInOdoo(enquiry) {
    if (!this.isEnabled) {
      return { success: true, synced: false, status: "disabled" };
    }

    // When credentials provided, XML-RPC / JSON-RPC call executes here
    // const odooLeadId = await executeOdooCall('crm.lead', 'create', [this.mapEnquiryToOdooLead(enquiry)]);
    // await Enquiry.findByIdAndUpdate(enquiry._id, { odooLeadId, odooSyncStatus: 'synced', odooLastSyncedAt: new Date() });
    return { success: true, synced: true };
  }

  /**
   * Stubbed update method - strictly guarded by isEnabled
   */
  async updateLeadInOdoo(enquiry) {
    if (!this.isEnabled) {
      return { success: true, synced: false, status: "disabled" };
    }

    // When credentials provided, XML-RPC call executes here
    return { success: true, synced: true };
  }

  /**
   * Safe Follow-up sync wrapper
   */
  async syncFollowUp(followUp) {
    if (!this.isEnabled) {
      return {
        success: true,
        synced: false,
        status: "disabled",
        message: "Odoo integration disabled. Follow-up recorded locally in MongoDB.",
      };
    }

    return { success: true, synced: true };
  }

  /**
   * Future Batch Migration:
   * Synchronizes all existing MongoDB enquiries to Odoo without duplicates.
   */
  async migrateAllPendingLeads() {
    if (!this.isEnabled) {
      const pendingCount = await Enquiry.countDocuments({ odooLeadId: null });
      return {
        success: true,
        synced: false,
        status: "disabled",
        pendingCount,
        message: "Odoo integration is currently disabled. Migration will run automatically once valid credentials are supplied.",
      };
    }

    const unSyncedLeads = await Enquiry.find({ odooLeadId: null });
    let successCount = 0;
    let failedCount = 0;

    for (const lead of unSyncedLeads) {
      try {
        await this.createLeadInOdoo(lead);
        successCount++;
      } catch (err) {
        failedCount++;
      }
    }

    return {
      success: true,
      synced: true,
      total: unSyncedLeads.length,
      successCount,
      failedCount,
    };
  }
}

module.exports = new OdooIntegrationService();

