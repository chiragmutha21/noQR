// @ts-nocheck
'use client';

import { useEffect, useRef, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Loader2, ArrowLeft, Scan, Volume2, VolumeX } from 'lucide-react';
import Script from 'next/script';
import { motion, AnimatePresence } from 'framer-motion';

function ARViewerContent() {
    const searchParams = useSearchParams();
    const id = searchParams.get('id');
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [arReady, setArReady] = useState(false);
    const [error, setError] = useState('');
    const [resources, setResources] = useState<{ image: string, video: string, ratio: number } | null>(null);
    const [started, setStarted] = useState(false);
    const [muted, setMuted] = useState(false);

    useEffect(() => {
        if (!id) {
            setError('No target ID provided');
            setLoading(false);
            return;
        }

        // Fetch content data
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/contents`)
            .then(res => res.json())
            .then(data => {
                const item = data.find((c: any) => c.contentId === id);
                if (item) {
                    const backendUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || '';
                    setResources({
                        image: backendUrl + item.imagePath,
                        video: item.videoPath.startsWith('http') ? item.videoPath : backendUrl + item.videoPath,
                        ratio: 1
                    });
                } else {
                    setError('Target not found');
                    setLoading(false);
                }
            })
            .catch(() => {
                setError('Connection failed');
                setLoading(false);
            });
    }, [id]);

    const handleArLoad = async () => {
        if (!resources) return;

        try {
            setLoading(true);
            const compiler = new window.MINDAR.IMAGE.Compiler();
            await compiler.importData(null);

            const image = new Image();
            image.crossOrigin = "anonymous";
            image.src = resources.image;

            await new Promise((resolve, reject) => {
                image.onload = resolve;
                image.onerror = reject;
            });

            await compiler.compileImageTargets([image], (progress: number) => {
                console.log("Compiling progress:", progress);
            });

            const exportedBuffer = await compiler.exportData();
            const blob = new Blob([exportedBuffer]);
            const mindFileUrl = URL.createObjectURL(blob);

            const sceneEl = document.querySelector('a-scene');
            if (sceneEl) {
                sceneEl.setAttribute('mindar-image', `imageTargetSrc: ${mindFileUrl}; autoStart: true; uiLoading: no; uiError: no; filterMinCF:0.0001; filterBeta: 0.001;`);
            }

            setArReady(true);
            setLoading(false);

            if (window.AFRAME && !window.AFRAME.components['vidhandler']) {
                window.AFRAME.registerComponent('vidhandler', {
                    init: function () {
                        this.toggle = false;
                        this.vid = document.querySelector("#ar-video");
                        this.vid.pause();
                    },
                    tick: function () {
                        if (this.el.object3D.visible === true) {
                            if (!this.toggle) {
                                this.toggle = true;
                                this.vid.play();
                                const overlay = document.getElementById('scanning-overlay');
                                if (overlay) overlay.style.opacity = '0';
                            }
                        } else {
                            if (this.toggle) {
                                this.toggle = false;
                                this.vid.pause();
                                const overlay = document.getElementById('scanning-overlay');
                                if (overlay) overlay.style.opacity = '1';
                            }
                        }
                    }
                });
            }

        } catch (err) {
            console.error("AR Compilation Failed:", err);
            setError("Failed to process image for AR.");
            setLoading(false);
        }
    };

    const startExperience = () => {
        setStarted(true);
        const v = document.getElementById('ar-video') as HTMLVideoElement;
        if (v) {
            v.muted = false;
            v.play().then(() => v.pause()).catch(() => { });
        }
    };

    if (error) return (
        <div className="flex h-screen items-center justify-center bg-black text-white">
            <div className="text-center p-6">
                <Scan className="w-16 h-16 text-red-500 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-red-500 mb-2">Target Unavailable</h2>
                <p className="text-zinc-500 mb-6 text-sm">{error}</p>
                <button onClick={() => router.back()} className="px-6 py-3 bg-zinc-800 rounded-full">Go Back</button>
            </div>
        </div>
    );

    return (
        <>
            <Script src="https://aframe.io/releases/1.4.2/aframe.min.js" strategy="beforeInteractive" />
            <Script src="https://cdn.jsdelivr.net/npm/mind-ar@1.2.2/dist/mindar-image-aframe.prod.js" strategy="afterInteractive" onLoad={handleArLoad} />

            <div className="fixed inset-0 z-50 bg-black overflow-hidden select-none">
                {loading && (
                    <div className="absolute inset-0 z-[60] flex flex-col items-center justify-center bg-black text-white">
                        <Loader2 className="w-10 h-10 animate-spin text-blue-500 mb-4" />
                        <p className="font-mono text-sm tracking-widest uppercase">Initializing RevealAR Engine</p>
                    </div>
                )}

                {!loading && !started && resources && (
                    <div className="absolute inset-0 z-[60] flex flex-col items-center justify-center bg-black/90 backdrop-blur-xl text-white p-6 text-center">
                        <div className="flex-1 flex flex-col items-center justify-center space-y-8">
                            <img src={resources.image} className="w-48 h-64 object-cover rounded-xl border border-white/20 shadow-2xl relative z-10" />
                            <div className="space-y-2">
                                <h1 className="text-2xl font-bold">Ready to Experience?</h1>
                                <p className="text-zinc-400 text-sm max-w-xs mx-auto">Point your camera at the target image.</p>
                            </div>
                        </div>
                        <button onClick={startExperience} className="w-full max-w-xs bg-white text-black font-bold py-4 rounded-full">START AR SCANNER</button>
                    </div>
                )}

                {started && (
                    <div className="absolute inset-0 pointer-events-none z-[50]">
                        <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start pointer-events-auto">
                            <button onClick={() => router.push('/')} className="p-3 bg-black/40 backdrop-blur-md rounded-full text-white border border-white/10">
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                            <button onClick={() => {
                                const v = document.getElementById('ar-video') as HTMLVideoElement;
                                if (v) { v.muted = !v.muted; setMuted(!muted); }
                            }} className="p-3 bg-black/40 backdrop-blur-md rounded-full text-white border border-white/10">
                                {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                            </button>
                        </div>
                        <div id="scanning-overlay" className="absolute inset-0 flex items-center justify-center transition-opacity duration-500">
                            <div className="w-64 h-64 border-2 border-white/20 rounded-3xl animate-pulse" />
                        </div>
                    </div>
                )}

                {resources && started && (
                    <a-scene
                        mindar-image={`imageTargetSrc: ${resources.image}; autoStart: true; uiLoading: no; uiError: no; filterMinCF:0.0001; filterBeta: 0.001;`}
                        vr-mode-ui="enabled: false"
                        device-orientation-permission-ui="enabled: false"
                        embedded
                        class="w-full h-full absolute inset-0 z-0"
                    >
                        <a-assets>
                            <video id="ar-video" src={resources.video} preload="auto" loop crossOrigin="anonymous" playsInline webkit-playsinline></video>
                        </a-assets>
                        <a-camera position="0 0 0" look-controls="enabled: false"></a-camera>
                        <a-entity mindar-image-target="targetIndex: 0">
                            <a-plane src="#ar-video" position="0 0 0" height="1" width="1" rotation="0 0 0" vidhandler></a-plane>
                        </a-entity>
                    </a-scene>
                )}
            </div>
        </>
    );
}

export default function ARViewer() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <ARViewerContent />
        </Suspense>
    );
}
