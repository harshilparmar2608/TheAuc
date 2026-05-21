"use client";

import { useState, useEffect } from "react";
import { ref, onValue, push, set, remove, update } from "firebase/database";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import toast from "react-hot-toast";
import { Trash2, Plus, UploadCloud, ChevronUp, ChevronDown } from "lucide-react";
import Image from "next/image";

type SponsorImage = {
  id: string;
  url: string;
  title: string;
  timestamp: number;
};

export default function SponsorsGallery() {
  const { role, loading: authLoading } = useAuth();
  const [sponsors, setSponsors] = useState<SponsorImage[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const sponsorsRef = ref(db, "sponsors");
    const unsub = onValue(sponsorsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.keys(data).map(key => ({
          ...data[key],
          id: key
        })) as SponsorImage[];
        setSponsors(list.sort((a, b) => b.timestamp - a.timestamp));
      } else {
        setSponsors([]);
      }
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const handleAddSponsor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast.error("Please select an image file to upload.");
      return;
    }

    setUploading(true);
    try {
      const apiKey = process.env.NEXT_PUBLIC_IMGBB_API_KEY;
      if (!apiKey) {
        toast.error("ImgBB API key is missing.");
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

      const newRef = push(ref(db, "sponsors"));
      await set(newRef, {
        url: downloadUrl,
        title: newTitle || "Official Sponsor",
        timestamp: Date.now()
      });
      toast.success("Sponsor uploaded successfully!");
      setFile(null);
      setNewTitle("");
      setShowAddForm(false);
    } catch (err) {
      toast.error("Failed to upload sponsor.");
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to remove this sponsor?")) {
      await remove(ref(db, `sponsors/${id}`));
      toast.success("Sponsor removed.");
    }
  };

  const handleMoveUp = async (index: number) => {
    if (index === 0) return;
    const current = sponsors[index];
    const above = sponsors[index - 1];
    
    let newCurrentTs = above.timestamp;
    let newAboveTs = current.timestamp;
    if (newCurrentTs === newAboveTs) {
      newCurrentTs += 1;
    }

    try {
      await update(ref(db), {
        [`sponsors/${current.id}/timestamp`]: newCurrentTs,
        [`sponsors/${above.id}/timestamp`]: newAboveTs
      });
    } catch (e) {
      toast.error("Failed to move sponsor");
    }
  };

  const handleMoveDown = async (index: number) => {
    if (index === sponsors.length - 1) return;
    const current = sponsors[index];
    const below = sponsors[index + 1];
    
    let newCurrentTs = below.timestamp;
    let newBelowTs = current.timestamp;
    if (newCurrentTs === newBelowTs) {
      newCurrentTs -= 1;
    }

    try {
      await update(ref(db), {
        [`sponsors/${current.id}/timestamp`]: newCurrentTs,
        [`sponsors/${below.id}/timestamp`]: newBelowTs
      });
    } catch (e) {
      toast.error("Failed to move sponsor");
    }
  };

  const isAdmin = role === "admin" || role === "super-admin";

  if (loading) return null;
  if (!isAdmin && sponsors.length === 0) return null;

  return (
    <div className="mb-16">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-br from-[#d4af37] via-[#fff8dc] to-[#c9992a] uppercase tracking-widest">
          Official Sponsors
        </h2>
        {!authLoading && isAdmin && (
          <button 
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-[#d4af37] text-black font-bold py-2 px-4 rounded-full hover:bg-yellow-400 transition flex items-center gap-1 shadow-[0_0_15px_rgba(212,175,55,0.3)] text-sm"
          >
            <Plus size={16} /> {showAddForm ? "Cancel" : "Add Sponsor"}
          </button>
        )}
      </div>

      {showAddForm && isAdmin && (
        <div className="glass p-6 rounded-2xl mb-8 max-w-md animate-fade-in border border-[#d4af37]/30">
          <h3 className="text-lg font-bold text-white mb-4">Upload Sponsor Logo</h3>
          <form onSubmit={handleAddSponsor} className="space-y-4">
            <div>
              <label className="block text-xs text-[#b0b8d4] mb-1">Select Image File</label>
              <input 
                required type="file" accept="image/*"
                onChange={e => setFile(e.target.files?.[0] || null)}
                className="w-full bg-black/50 border border-white/20 rounded p-3 text-sm text-white focus:border-[#d4af37] focus:outline-none file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-[#d4af37]/20 file:text-[#d4af37] hover:file:bg-[#d4af37]/30" 
              />
            </div>
            <div>
              <label className="block text-xs text-[#b0b8d4] mb-1">Sponsor Name (Optional)</label>
              <input 
                type="text" placeholder="Global Corp..."
                value={newTitle} onChange={e => setNewTitle(e.target.value)} 
                className="w-full bg-black/50 border border-white/20 rounded p-3 text-sm text-white focus:border-[#d4af37] focus:outline-none" 
              />
            </div>
            <button disabled={uploading} type="submit" className="w-full flex items-center justify-center gap-2 bg-[#d4af37] text-black font-bold py-3 rounded-lg hover:bg-yellow-400 transition disabled:opacity-70 disabled:cursor-not-allowed">
              {uploading ? "Uploading..." : <><UploadCloud size={18} /> Upload Sponsor</>}
            </button>
          </form>
        </div>
      )}

      {sponsors.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {sponsors.map((img, index) => (
            <div key={img.id} className="relative group glass rounded-xl p-4 border border-white/10 hover:border-[#d4af37]/50 transition-all shadow-[0_0_20px_rgba(0,0,0,0.5)] bg-white/5 flex flex-col items-center justify-center aspect-square">
              
              <div className="relative w-full h-full flex items-center justify-center mb-2">
                <img 
                  src={img.url} 
                  alt={img.title}
                  className="max-w-full max-h-full object-contain"
                  loading="lazy"
                />
              </div>
              {img.title && img.title !== "Official Sponsor" && (
                <p className="text-white font-bold text-center text-xs w-full truncate mt-2">{img.title}</p>
              )}

              {isAdmin && (
                <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 p-1.5 rounded-lg border border-white/10">
                  <button onClick={() => handleMoveUp(index)} disabled={index === 0} className="p-1 hover:bg-white/20 rounded disabled:opacity-30 transition">
                    <ChevronUp size={14} className="text-white" />
                  </button>
                  <button onClick={() => handleMoveDown(index)} disabled={index === sponsors.length - 1} className="p-1 hover:bg-white/20 rounded disabled:opacity-30 transition">
                    <ChevronDown size={14} className="text-white" />
                  </button>
                  <button onClick={() => handleDelete(img.id)} className="p-1 hover:bg-red-500/20 rounded text-red-400 transition mt-1">
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
