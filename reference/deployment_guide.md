# Deployment Guide: AR Image Recognition System

## 1. Backend Deployment (Vercel/DigitalOcean)
The backend requires a persistent file system or S3 for `uploads`. Vercel is not recommended for the backend if you use local file storage.

### Option A: Railway / Render / DigitalOcean (Recommended)
1. **Prepare Environment**: Update `.env` with `MONGO_URI` and `UPLOAD_DIR`.
2. **OpenCV Dependencies**: Ensure the target environment has OpenCV installed. On Linux (Ubuntu), run:
   ```bash
   sudo apt-get install libopencv-dev python3-opencv
   ```
3. **Build Script**: Ensure `npm install` runs successfully.
4. **Database**: Use MongoDB Atlas for a free managed tier.

## 2. Frontend Deployment (Vercel)
The frontend is optimized for Vercel.

1. **Environment Variables**: In Vercel Project Settings, set:
   - `NEXT_PUBLIC_API_URL`: Your backend API URL (e.g., `https://api.yourdomain.com/api`)
2. **Build Configuration**:
   - Build Command: `npm run build`
   - Output Directory: `.next`
3. **Domain**: If your backend is on a different domain, ensure CORS is configured in `backend/server.js`:
   ```javascript
   app.use(cors({ origin: 'https://your-frontend.vercel.app' }));
   ```

## 3. Production Optimizations
- **Image CDN**: Move `uploads/` to AWS S3 or Cloudinary and update the backend to generate signed URLs.
- **Worker Threads**: Offload OpenCV processing to a background worker if you expect high concurrent uploads.
- **Security Check**: Add JWT authentication to the `/api/upload` and `/api/content/:id` routes to prevent public modification of your AR targets.
