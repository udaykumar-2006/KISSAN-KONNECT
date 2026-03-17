import { useState } from "react";
import { useAppStore } from "@/stores/AppStore";
import { useAuth } from "@/contexts/AuthContext";
import CropCard from "@/components/CropCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Pencil, Trash2, ImageIcon } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cropCategories } from "@/data/categoriesData";
import  toast  from "react-hot-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

const defaultImages = {
  Vegetables: "https://images.unsplash.com/photo-1592924357228-91a4daadce55?w=400",
  Fruits: "https://images.unsplash.com/photo-1553279768-865429fa0078?w=400",
  Grains: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400",
  Pulses: "https://images.unsplash.com/photo-1585032226651-759b368d7246?w=400",
  Spices: "https://images.unsplash.com/photo-1615485500704-8e990f9900f7?w=400",
};

const FarmerCrops = () => {
  const { userId, userName } = useAuth();
  const { crops, addCrop, updateCrop, deleteCrop } = useAppStore();
  const myCrops = crops.filter(c => c.farmerId === userId);

  const [open, setOpen] = useState(false);
  const [editCrop, setEditCrop] = useState(null);

  // Form state
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");
  const [minQty, setMinQty] = useState("");
  const [availQty, setAvailQty] = useState("");
  const [harvestDate, setHarvestDate] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imagePreview, setImagePreview] = useState("");

  const resetForm = () => {
    setName(""); setCategory(""); setPrice(""); setMinQty(""); setAvailQty("");
    setHarvestDate(""); setLocation(""); setDescription(""); setImageUrl(""); setImagePreview("");
    setEditCrop(null);
  };

  const openEdit = (crop) => {
    setEditCrop(crop);
    setName(crop.name);
    setCategory(crop.category);
    setPrice(String(crop.pricePerKg));
    setMinQty(String(crop.minQuantityKg));
    setAvailQty(String(crop.availableQuantityKg));
    setHarvestDate(crop.harvestDate);
    setLocation(crop.location);
    setDescription(crop.description);
    setImageUrl(crop.image);
    setImagePreview(crop.image);
    setOpen(true);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const url = reader.result;
        setImagePreview(url);
        setImageUrl(url);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = () => {
    if (!name || !category || !price || !minQty || !availQty || !location) {
      toast.error("Please fill all required fields");
      return;
    }

    const img = imageUrl || defaultImages[category] || defaultImages.Vegetables;

    if (editCrop) {
      updateCrop(editCrop.id, {
        name, category, pricePerKg: Number(price), minQuantityKg: Number(minQty),
        availableQuantityKg: Number(availQty), harvestDate, location, description, image: img,
      });
      toast.success("Crop updated successfully! ✅");
    } else {
      addCrop({
        farmerId: userId, farmerName: userName, name, category,
        pricePerKg: Number(price), minQuantityKg: Number(minQty),
        availableQuantityKg: Number(availQty), harvestDate, location, description, image: img,
      });
      toast.success("Crop added successfully! 🌾");
    }
    setOpen(false);
    resetForm();
  };

  const handleDelete = (id) => {
    deleteCrop(id);
    toast.success("Crop deleted");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">My Crops</h1>
          <p className="text-muted-foreground text-sm">Manage your listed crops ({myCrops.length} total)</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="gradient-hero text-primary-foreground border-0"><Plus className="w-4 h-4 mr-1" /> Add Crop</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-auto">
            <DialogHeader>
              <DialogTitle className="font-display">{editCrop ? "Edit Crop" : "Add New Crop"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* Image Upload */}
              <div>
                <Label>Crop Image</Label>
                <div className="mt-1 flex items-center gap-4">
                  {imagePreview ? (
                    <img src={imagePreview} alt="Preview" className="w-20 h-20 rounded-lg object-cover border border-border" />
                  ) : (
                    <div className="w-20 h-20 rounded-lg bg-muted flex items-center justify-center border border-border">
                      <ImageIcon className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}
                  <div>
                    <label className="cursor-pointer">
                      <span className="text-sm text-primary hover:underline">Upload image</span>
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                    </label>
                    <p className="text-xs text-muted-foreground mt-1">Or a default image will be used</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div><Label>Crop Name *</Label><Input placeholder="e.g. Organic Wheat" value={name} onChange={e => setName(e.target.value)} /></div>
                <div>
                  <Label>Category *</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>
                      {cropCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Price per Kg (₹) *</Label><Input type="number" placeholder="32" value={price} onChange={e => setPrice(e.target.value)} /></div>
                <div><Label>Min Quantity (kg) *</Label><Input type="number" placeholder="50" value={minQty} onChange={e => setMinQty(e.target.value)} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Available Quantity (kg) *</Label><Input type="number" placeholder="2000" value={availQty} onChange={e => setAvailQty(e.target.value)} /></div>
                <div><Label>Harvest Date</Label><Input type="date" value={harvestDate} onChange={e => setHarvestDate(e.target.value)} /></div>
              </div>
              <div><Label>Location *</Label><Input placeholder="City, State" value={location} onChange={e => setLocation(e.target.value)} /></div>
              <div><Label>Description</Label><Textarea placeholder="Describe your crop..." value={description} onChange={e => setDescription(e.target.value)} /></div>
              <Button className="w-full gradient-hero text-primary-foreground border-0" onClick={handleSubmit}>
                {editCrop ? "Update Crop" : "Add Crop"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {myCrops.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg mb-2">No crops listed yet</p>
          <p className="text-sm">Click "Add Crop" to start selling!</p>
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {myCrops.map(crop => (
          <CropCard
            key={crop.id}
            crop={crop}
            actions={
              <>
                <Button size="sm" variant="outline" className="flex-1" onClick={() => openEdit(crop)}>
                  <Pencil className="w-3 h-3 mr-1" /> Edit
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="outline" className="text-destructive hover:bg-destructive hover:text-destructive-foreground">
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete "{crop.name}"?</AlertDialogTitle>
                      <AlertDialogDescription>This action cannot be undone. This will permanently remove the crop listing.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDelete(crop.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            }
          />
        ))}
      </div>
    </div>
  );
};

export default FarmerCrops;
