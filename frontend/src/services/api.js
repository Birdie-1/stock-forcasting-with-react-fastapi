import toast from 'react-hot-toast';

const API_URL = 'http://localhost:8000';

export const apiCall = async (endpoint, options = {}) => {
    try {
        const response = await fetch(`${API_URL}${endpoint}`, options);

        if (!response.ok) {
            const error = await response.json();
            const errorMessage = error.detail || 'API Error';
            throw new Error(errorMessage);
        }

        return await response.json();
    } catch (error) {
        // Toast the error so the user sees it immediately
        toast.error(error.message);
        throw error;
    }
};
