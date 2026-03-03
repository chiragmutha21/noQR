# AR Image Recognition System

This project contains a production-ready Augmented Reality (AR) backend and guidance for the Unity/Vuforia mobile application.

## 🚀 Backend (Node.js + Express + OpenCV)

### Setup
1. Install OpenCV on your system.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Update `MONGO_URI` in `.env`.
4. Run the server:
   ```bash
   npm start
   ```

### Features
- **Secure Uploads**: Uses Multer with file type filtering.
- **ORB Feature Extraction**: Generates target descriptors via OpenCV.
- **Scalable Storage**: Stores files in structured folders and metadata in MongoDB.

## 📱 Mobile App (Unity + Vuforia)

### Setup Steps
1. **Unity Version**: Use 2021.3 LTS or newer.
2. **Vuforia**: Install via Package Manager or `.unitypackage`.
3. **AR Camera**:
   - Replace Main Camera with Vuforia AR Camera.
   - Enter your License Key in Vuforia Configuration.
4. **Dynamic Image Targets**:
   - Use the provided `ARController.cs` to download descriptors and video URLs at runtime.

### C# Integration Example
Attached in `scripts/ARController.cs`.

## 🛠 Optimization Tips
- **Image Resizing**: Resize reference images to ~1000px before uploading to keep descriptor files small.
- **Video Bitrate**: Optimize videos for mobile playback (H.264, standard bitrate).
- **Concurrency**: Use a task queue (like Bull/Redis) for OpenCV processing in high-traffic environments.

## 📄 License
MIT
