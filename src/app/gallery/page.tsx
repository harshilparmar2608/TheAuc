"use client";

import { useState, useEffect } from "react";
import { ref, onValue, push, set, remove, update } from "firebase/database";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import toast from "react-hot-toast";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Trash2, Plus, ImageIcon, UploadCloud, ChevronUp, ChevronDown } from "lucide-react";

type GalleryImage = {
  id: string;
  url: string;
  title: string;
  timestamp: number;
};

export default function GalleryPage() {
  const { role, loading: authLoading } = useAuth();
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const galleryRef = ref(db, "gallery");
    const unsub = onValue(galleryRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.keys(data).map(key => ({
          ...data[key],
          id: key
        })) as GalleryImage[];
        setImages(list.sort((a, b) => b.timestamp - a.timestamp));
      } else {
        setImages([]);
      }
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const handleAddPhoto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast.error("Please select an image file to upload.");
      return;
    }

    setUploading(true);
    try {
      // 1. Upload to ImgBB
      const apiKey = process.env.NEXT_PUBLIC_IMGBB_API_KEY;
      if (!apiKey) {
        toast.error("ImgBB API key is missing from environment variables.");
        setUploading(false);
        return;
      }

      const formData = new FormData();
      formData.append("image", file);

      const res = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error?.message || "ImgBB upload failed");
      }

      const downloadUrl = data.data.url;

      // 2. Save metadata to RTDB
      const newRef = push(ref(db, "gallery"));
      await set(newRef, {
        url: downloadUrl,
        title: newTitle || "GJPL Moment",
        timestamp: Date.now()
      });
      toast.success("Photo uploaded successfully!");
      setFile(null);
      setNewTitle("");
      setShowAddForm(false);
    } catch (err) {
      toast.error("Failed to upload photo.");
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this photo?")) {
      await remove(ref(db, `gallery/${id}`));
      toast.success("Photo removed.");
    }
  };

  const handleMoveUp = async (index: number) => {
    if (index === 0) return;
    const current = images[index];
    const above = images[index - 1];
    
    // ensure distinct timestamps if they somehow match
    let newCurrentTs = above.timestamp;
    let newAboveTs = current.timestamp;
    if (newCurrentTs === newAboveTs) {
      newCurrentTs += 1;
    }

    try {
      await update(ref(db), {
        [`gallery/${current.id}/timestamp`]: newCurrentTs,
        [`gallery/${above.id}/timestamp`]: newAboveTs
      });
    } catch (e) {
      toast.error("Failed to move photo");
    }
  };

  const handleMoveDown = async (index: number) => {
    if (index === images.length - 1) return;
    const current = images[index];
    const below = images[index + 1];
    
    let newCurrentTs = below.timestamp;
    let newBelowTs = current.timestamp;
    if (newCurrentTs === newBelowTs) {
      newCurrentTs -= 1;
    }

    try {
      await update(ref(db), {
        [`gallery/${current.id}/timestamp`]: newCurrentTs,
        [`gallery/${below.id}/timestamp`]: newBelowTs
      });
    } catch (e) {
      toast.error("Failed to move photo");
    }
  };

  const isAdmin = role === "admin" || role === "super-admin";

  return (
    <main className="min-h-screen pb-20" style={{ background: "radial-gradient(ellipse at 50% 0%, #0f1535 0%, #0a0e27 60%)" }}>
      {/* Header */}
      <div className="relative py-20 px-6 overflow-hidden flex flex-col items-center text-center">
        <div style={{ position: "absolute", top: "20%", left: "50%", transform: "translateX(-50%)", width: 600, height: 400, background: "radial-gradient(ellipse, rgba(212,175,55,0.15) 0%, transparent 70%)", pointerEvents: "none" }} />
        
        <Link href="/" className="absolute top-8 left-8 text-[#b0b8d4] hover:text-white transition flex items-center gap-2 text-sm uppercase tracking-wider font-semibold">
          <ArrowLeft size={16} />
          <span>Back to Home</span>
        </Link>

        <div className="mb-6 filter drop-shadow-[0_0_30px_rgba(212,175,55,0.5)]">
          <ImageIcon size={64} className="text-[#d4af37]" strokeWidth={1.5} />
        </div>
        <h1 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-br from-[#d4af37] via-[#fff8dc] to-[#c9992a] mb-4 tracking-tight">
          GJPL Gallery
        </h1>
        <p className="text-[#b0b8d4] max-w-xl mx-auto text-lg font-light leading-relaxed">
          Relive the greatest moments and memories from the Ganga Jamna Premier League.
        </p>

        {!authLoading && isAdmin && (
          <button 
            onClick={() => setShowAddForm(!showAddForm)}
            className="mt-8 bg-[#d4af37] text-black font-bold py-3 px-6 rounded-full hover:bg-yellow-400 transition flex items-center gap-2 shadow-[0_0_15px_rgba(212,175,55,0.3)]"
          >
            <Plus size={20} /> {showAddForm ? "Cancel" : "Add Photo"}
          </button>
        )}
      </div>

      <div className="max-w-6xl mx-auto px-6">
        
        {/* Add Photo Form */}
        {showAddForm && isAdmin && (
          <div className="glass p-6 rounded-2xl mb-12 max-w-md mx-auto animate-fade-in border border-[#d4af37]/30">
            <h2 className="text-xl font-bold text-white mb-4">Upload New Photo</h2>
            <form onSubmit={handleAddPhoto} className="space-y-4">
              <div>
                <label className="block text-xs text-[#b0b8d4] mb-1">Select Image File</label>
                <div className="relative">
                  <input 
                    required type="file" accept="image/*"
                    onChange={e => setFile(e.target.files?.[0] || null)}
                    className="w-full bg-black/50 border border-white/20 rounded p-3 text-sm text-white focus:border-[#d4af37] focus:outline-none file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-[#d4af37]/20 file:text-[#d4af37] hover:file:bg-[#d4af37]/30" 
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-[#b0b8d4] mb-1">Caption / Title (Optional)</label>
                <input 
                  type="text" placeholder="Winning Moment..."
                  value={newTitle} onChange={e => setNewTitle(e.target.value)} 
                  className="w-full bg-black/50 border border-white/20 rounded p-3 text-sm text-white focus:border-[#d4af37] focus:outline-none" 
                />
              </div>
              <button disabled={uploading} type="submit" className="w-full flex items-center justify-center gap-2 bg-[#d4af37] text-black font-bold py-3 rounded-lg hover:bg-yellow-400 transition disabled:opacity-70 disabled:cursor-not-allowed">
                {uploading ? "Uploading..." : <><UploadCloud size={18} /> Upload to Gallery</>}
              </button>
            </form>
          </div>
        )}

        {/* Gallery Grid */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-12 h-12 rounded-full border-4 border-[#d4af37]/20 border-t-[#d4af37] animate-spin" />
          </div>
        ) : images.length === 0 ? (
          <div className="text-center py-20 bg-white/5 rounded-2xl border border-white/10">
            <p className="text-[#b0b8d4] text-lg">No photos have been added yet.</p>
          </div>
        ) : (
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-6 space-y-6">
            {images.map(img => (
              <div key={img.id} className="break-inside-avoid relative group">
                <div className="glass rounded-xl overflow-hidden border border-white/10 transition hover:border-[#d4af37]/30">
                  {/* Image container */}
                  <div className="relative w-full overflow-hidden" style={{ minHeight: "200px" }}>
                    {/* Fallback styling for plain img tag since domains might not be configured in next.config.js */}
                    <img 
                      src={img.url} 
                      alt={img.title}
                      className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-105"
                      loading="lazy"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "/logo.png";
                      }}
                    />
                  </div>
                  
                  {/* Overlay text */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                    <p className="text-white font-bold truncate">{img.title}</p>
                    <p className="text-xs text-[#b0b8d4]">{new Date(img.timestamp).toLocaleDateString()}</p>
                  </div>

                  {/* Admin Controls */}
                  {isAdmin && (
                    <div className="absolute top-3 right-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all">
                      {images.indexOf(img) > 0 && (
                        <button 
                          onClick={() => handleMoveUp(images.indexOf(img))}
                          className="p-2 bg-black/60 backdrop-blur-sm text-white rounded-full hover:bg-[#d4af37] hover:text-black hover:scale-110 shadow-lg transition-all"
                          title="Move Up"
                        >
                          <ChevronUp size={16} />
                        </button>
                      )}
                      {images.indexOf(img) < images.length - 1 && (
                        <button 
                          onClick={() => handleMoveDown(images.indexOf(img))}
                          className="p-2 bg-black/60 backdrop-blur-sm text-white rounded-full hover:bg-[#d4af37] hover:text-black hover:scale-110 shadow-lg transition-all"
                          title="Move Down"
                        >
                          <ChevronDown size={16} />
                        </button>
                      )}
                      <button 
                        onClick={() => handleDelete(img.id)}
                        className="p-2 bg-red-500/80 text-white rounded-full hover:bg-red-500 hover:scale-110 shadow-lg transition-all"
                        title="Delete Photo"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </main>
  );
}
