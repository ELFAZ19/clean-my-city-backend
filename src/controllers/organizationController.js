/**
 * Organization Controller
 * Handles organization management (Admin only)
 */

const organizationService = require('../services/organizationService');

/**
 * Create a new organization
 * POST /api/organizations
 */
const createOrganization = async (req, res, next) => {
    try {
        const organization = await organizationService.createOrganization(req.body);

        res.status(201).json({
            success: true,
            message: 'Organization created successfully',
            data: { organization }
        });

    } catch (error) {
        next(error);
    }
};

/**
 * Update organization
 * PUT /api/organizations/:id
 */
const updateOrganization = async (req, res, next) => {
    try {
        const orgId = parseInt(req.params.id);
        const organization = await organizationService.updateOrganization(orgId, req.body, req.user);

        res.status(200).json({
            success: true,
            message: 'Organization updated successfully',
            data: { organization }
        });

    } catch (error) {
        next(error);
    }
};

/**
 * Activate organization
 * PUT /api/organizations/:id/activate
 */
const activateOrganization = async (req, res, next) => {
    try {
        const orgId = parseInt(req.params.id);
        const organization = await organizationService.activateOrganization(orgId);

        res.status(200).json({
            success: true,
            message: 'Organization activated successfully',
            data: { organization }
        });

    } catch (error) {
        next(error);
    }
};

/**
 * Deactivate organization
 * PUT /api/organizations/:id/deactivate
 */
const deactivateOrganization = async (req, res, next) => {
    try {
        const orgId = parseInt(req.params.id);
        const organization = await organizationService.deactivateOrganization(orgId);

        res.status(200).json({
            success: true,
            message: 'Organization deactivated successfully',
            data: { organization }
        });

    } catch (error) {
        next(error);
    }
};

/**
 * Get all organizations
 * GET /api/organizations
 */
const getAllOrganizations = async (req, res, next) => {
    try {
        const activeOnly = req.query.active === 'true';
        const organizations = await organizationService.getAllOrganizations(activeOnly);

        res.status(200).json({
            success: true,
            data: {
                count: organizations.length,
                organizations
            }
        });

    } catch (error) {
        next(error);
    }
};

/**
 * Get organization by ID
 * GET /api/organizations/:id
 */
const getOrganizationById = async (req, res, next) => {
    try {
        const orgId = parseInt(req.params.id);
        const organization = await organizationService.getOrganizationById(orgId);

        res.status(200).json({
            success: true,
            data: { organization }
        });

    } catch (error) {
        next(error);
    }
};

/**
 * Get public organizations list (for citizens)
 * GET /api/organizations/public
 * Returns only active organizations with basic info (no login credentials)
 */
const getPublicOrganizations = async (req, res, next) => {
    try {
        const organizations = await organizationService.getPublicOrganizations();

        res.status(200).json({
            success: true,
            data: {
                count: organizations.length,
                organizations
            }
        });

    } catch (error) {
        next(error);
    }
};

/**
 * Get current user's organization info
 * GET /api/organizations/me
 */
const getMyOrganization = async (req, res, next) => {
    try {
        const organization = await organizationService.getMyOrganization(req.user.id);

        res.status(200).json({
            success: true,
            data: { organization }
        });

    } catch (error) {
        next(error);
    }
};

module.exports = {
    createOrganization,
    updateOrganization,
    activateOrganization,
    deactivateOrganization,
    getAllOrganizations,
    getOrganizationById,
    getMyOrganization,
    getPublicOrganizations,
    deleteOrganization: async (req, res, next) => {
        try {
            const orgId = parseInt(req.params.id);
            await organizationService.deleteOrganization(orgId);
            res.status(200).json({ success: true, message: 'Organization deleted successfully.' });
        } catch (error) { next(error); }
    },
    exportOrgReport: async (req, res, next) => {
        try {
            const orgId = parseInt(req.params.id);
            const format = (req.query.format || 'csv').toLowerCase();
            const { issues, orgName } = await organizationService.getOrgExportData(orgId);
            const safeDate = new Date().toISOString().split('T')[0];
            const filename = `${orgName.replace(/[^a-z0-9]/gi, '_')}_report_${safeDate}`;

            if (format === 'xlsx') {
                const ExcelJS = require('exceljs');
                const wb = new ExcelJS.Workbook();
                const ws = wb.addWorksheet('Issues');
                ws.columns = [
                    { header: 'ID',          key: 'id',           width: 8  },
                    { header: 'Title',        key: 'title',        width: 40 },
                    { header: 'Description',  key: 'description',  width: 60 },
                    { header: 'Status',       key: 'status',       width: 15 },
                    { header: 'Citizen',      key: 'citizen_name', width: 30 },
                    { header: 'Latitude',     key: 'latitude',     width: 14 },
                    { header: 'Longitude',    key: 'longitude',    width: 14 },
                    { header: 'Created At',   key: 'created_at',   width: 22 },
                    { header: 'Resolved At',  key: 'resolved_at',  width: 22 },
                ];
                ws.getRow(1).font = { bold: true };
                issues.forEach(i => ws.addRow(i));
                res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
                res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);
                await wb.xlsx.write(res);
                res.end();
            } else {
                // CSV fallback — no external dep needed
                const cols = ['id','title','description','status','citizen_name','latitude','longitude','created_at','resolved_at'];
                const escape = v => v == null ? '' : `"${String(v).replace(/"/g, '""')}"`;
                const rows = [cols.join(','), ...issues.map(i => cols.map(c => escape(i[c])).join(','))];
                res.setHeader('Content-Type', 'text/csv');
                res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
                res.send(rows.join('\n'));
            }
        } catch (error) { next(error); }
    }
};
