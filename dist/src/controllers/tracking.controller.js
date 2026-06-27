import { trackingModel } from '../models/tracking.js';
import { errandModel } from '../models/errand.js';
export const updateLocation = async (req, res) => {
    try {
        const errandId = req.params.errandId;
        const { latitude, longitude } = req.body;
        if (latitude === undefined || longitude === undefined) {
            return res.status(400).json({ error: 'Latitude and longitude are required' });
        }
        // Verify errand exists and is in progress
        const errand = await errandModel.getErrand(errandId);
        if (!errand) {
            return res.status(404).json({ error: 'Errand not found' });
        }
        if (errand.state !== 'ACCEPTED' && errand.state !== 'ITEM_VERIFIED' && errand.state !== 'IN_PROGRESS') {
            return res.status(400).json({ error: 'Tracking is only active for accepted or in-progress errands' });
        }
        await trackingModel.updateLocation(errandId, latitude, longitude);
        return res.status(200).json({ message: 'Location updated successfully' });
    }
    catch (error) {
        console.error('Error updating location:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};
export const getLocation = async (req, res) => {
    try {
        const errandId = req.params.errandId;
        const trackingData = await trackingModel.getLocationHistory(errandId);
        if (!trackingData) {
            return res.status(404).json({ error: 'No tracking data found for this errand' });
        }
        // Return the latest location along with the history
        const latestPoint = trackingData.points[trackingData.points.length - 1];
        return res.status(200).json({
            errandId,
            latestLocation: latestPoint,
            history: trackingData.points
        });
    }
    catch (error) {
        console.error('Error fetching location:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};
