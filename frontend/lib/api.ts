import axios from 'axios';

// Use environment variable or fallback to 127.0.0.1
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000/api';

const api = axios.create({
    baseURL: API_BASE,
    withCredentials: true,
});

export interface ARContent {
    _id: string;
    contentId: string;
    originalImageName: string;
    imagePath: string;
    videoPath: string;
    descriptorPath: string;
    createdAt: string;
    type: string;
    title?: string;
    text?: string;
    url?: string;
    metadata?: {
        keypointsCount: number;
        fileSize: number;
    };
    analytics?: {
        totalScans: number;
        countryScans: Record<string, number>;
    };
}

// ── Step 2: Attached content types ──────────────────────────────────────

export interface AttachedContent {
    _id?: string;
    attachmentId: string;
    contentId: string;
    type: 'video' | 'audio' | 'image' | 'text' | 'pdf';
    url?: string | null;
    text?: string | null;
    title: string;
    order: number;
    createdAt: string;
}

export interface ScanResponse {
    matchFound: boolean;
    confidence: number;
    content?: ARContent;
    attachments: AttachedContent[];
    message: string;
}

// ── API functions ───────────────────────────────────────────────────────

export const getContentList = (email?: string) =>
    api.get<ARContent[]>('/contents', { params: { email } });
export const deleteContent = (id: string) => api.delete(`/content/${id}`);
export const uploadContent = (formData: FormData, onProgress: (progress: number) => void) => {
    return api.post('/upload', formData, {
        onUploadProgress: (progressEvent) => {
            const progress = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 100));
            onProgress(progress);
        },
    });
};
export const updateContent = (id: string, formData: FormData) => {
    return api.put(`/content/${id}`, formData);
};

// Step 2: Attach multimedia content
export const attachContent = (formData: FormData) => {
    return api.post('/attach-content', formData);
};
export const getAttachedContents = (contentId: string) =>
    api.get<AttachedContent[]>(`/attached-contents/${contentId}`);
export const deleteAttachedContent = (attachmentId: string) =>
    api.delete(`/attached-content/${attachmentId}`);

// Step 3: Scan a frame
export const scanFrame = (formData: FormData) => {
    return api.post<ScanResponse>('/scan', formData);
};

export default api;
