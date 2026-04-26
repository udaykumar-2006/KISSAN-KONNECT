import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import StarRating from "@/components/StarRating";
import toast from "react-hot-toast";
import { User, MapPin, Lock, BarChart3, Camera, Loader2, ShoppingBag, Wheat, MessageSquare, Star } from "lucide-react";
import { motion } from "framer-motion";
import * as api from "@/services/api";

const ProfilePage = () => {
  const { currentUser, userName, userEmail, userAddress, userPhone, userPhoto, role, userId, avgRating, numRatings, updateProfile, changePassword } = useAuth();

  const [orders, setOrders] = useState([]);
  const [crops, setCrops] = useState([]);
  const [bargains, setBargains] = useState([]);
  const [receivedRatings, setReceivedRatings] = useState([]);

  useEffect(() => {
    if (role === 'farmer') {
      api.getMyCrops().then(res => setCrops(res.data)).catch(() => {});
      api.getFarmerRatings(userId).then(res => setReceivedRatings(res.data.ratings || [])).catch(() => {});
    } else {
        api.getBuyerRatings(userId).then(res => setReceivedRatings(res.data.ratings || [])).catch(() => {});
    }
    api.getOrders().then(res => setOrders(res.data)).catch(() => {});
    api.getBargains().then(res => setBargains(res.data)).catch(() => {});
  }, [role, userId]);

  // Edit state
  const [editName, setEditName] = useState(userName);
  const [editPhone, setEditPhone] = useState(userPhone);
  const [editAddress, setEditAddress] = useState({ ...userAddress });
  const [photoUrl, setPhotoUrl] = useState(userPhoto);
  const [saving, setSaving] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(false);

  // Password state
  const [oldPw, setOldPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");

  const updateAddr = (field, value) => {
    setEditAddress(prev => ({ ...prev, [field]: value }));
  };

  const handleDetectLocation = () => {
    if (!navigator.geolocation) { toast.error("Geolocation not supported"); return; }
    setDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&addressdetails=1`);
          const data = await res.json();
          const a = data.address || {};
          setEditAddress({
            street: [a.road, a.neighbourhood, a.suburb].filter(Boolean).join(", ") || "",
            landmark: a.amenity || a.building || "",
            city: a.city || a.town || a.village || a.county || "",
            state: a.state || "",
            pincode: a.postcode || "",
          });
          toast.success("Location detected! 📍");
        } catch { toast.error("Could not fetch address"); }
        finally { setDetectingLocation(false); }
      },
      () => { toast.error("Location access denied"); setDetectingLocation(false); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSaveProfile = async () => {
    if (!editName.trim()) { toast.error("Name is required"); return; }
    if (!editAddress.city || !editAddress.state || !editAddress.pincode) { toast.error("City, state and pincode are required"); return; }
    if (editAddress.pincode && !/^\d{6}$/.test(editAddress.pincode)) { toast.error("Enter valid 6-digit pincode"); return; }
    setSaving(true);
    await updateProfile({ name: editName, phone: editPhone, address: editAddress, photo: photoUrl });
    setSaving(false);
    toast.success("Profile updated! ✅");
  };

  const handleChangePassword = async () => {
    if (!oldPw || !newPw) { toast.error("Fill all password fields"); return; }
    if (newPw !== confirmPw) { toast.error("Passwords don't match"); return; }

    const result = await changePassword(oldPw, newPw);
    if (result.success) {
      toast.success("Password changed! 🔒");
      setOldPw(""); setNewPw(""); setConfirmPw("");
    } else {
      toast.error(result.error || "Failed to change password");
    }
  };

  // Activity stats
  const myOrders = orders.filter(o => role === "farmer" ? o.farmerId === userId : o.buyerId === userId);
  const myCrops = role === "farmer" ? crops.filter(c => c.farmerId === userId) : [];
  const myBargains = bargains.filter(b => role === "farmer" ? b.farmerId === userId : b.buyerId === userId);
  const totalRevenue = myOrders.reduce((sum, o) => sum + o.totalPrice, 0);
  const activeOrders = myOrders.filter(o => o.status !== "delivered" && o.status !== "COMPLETED").length;

  const initials = userName?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "U";

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 bg-gradient-to-r from-primary/10 via-transparent to-transparent p-6 rounded-3xl border border-primary/10">
        <div className="flex items-center gap-5">
            <div className="relative">
                <Avatar className="w-24 h-24 border-4 border-background shadow-xl">
                    <AvatarImage src={photoUrl} />
                    <AvatarFallback className="bg-primary/10 text-primary text-2xl font-bold">{initials}</AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center cursor-pointer shadow-lg hover:scale-110 transition-transform">
                    <Camera className="w-4 h-4" />
                </div>
            </div>
            <div>
                <h1 className="text-3xl font-display font-bold text-foreground">{userName}</h1>
                <p className="text-muted-foreground flex items-center gap-1.5 mt-0.5">
                    <span className="capitalize px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold tracking-wider">{role}</span>
                    <span className="text-xs">Member since {currentUser?.joinedAt ? new Date(currentUser.joinedAt).getFullYear() : '2024'}</span>
                </p>
                {avgRating > 0 && (
                    <div className="flex items-center gap-2 mt-2 bg-secondary/10 w-fit px-2 py-0.5 rounded-full border border-secondary/20">
                        <Star className="w-3.5 h-3.5 fill-secondary text-secondary" />
                        <span className="text-sm font-bold text-secondary-foreground">{avgRating.toFixed(1)}</span>
                        <span className="text-[10px] text-muted-foreground font-medium">({numRatings} ratings)</span>
                    </div>
                )}
            </div>
        </div>
        <div className="flex gap-2">
            <Button variant="outline" className="rounded-full h-10 px-6 font-semibold" onClick={() => toast.info("Profile link copied!")}>Share Profile</Button>
        </div>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid grid-cols-4 w-full bg-muted/50 p-1 rounded-2xl">
          <TabsTrigger value="profile" className="rounded-xl gap-2 font-semibold"><User className="w-4 h-4" /> Profile</TabsTrigger>
          <TabsTrigger value="activity" className="rounded-xl gap-2 font-semibold"><BarChart3 className="w-4 h-4" /> Activity</TabsTrigger>
          <TabsTrigger value="reviews" className="rounded-xl gap-2 font-semibold"><Star className="w-4 h-4" /> Reviews</TabsTrigger>
          <TabsTrigger value="security" className="rounded-xl gap-2 font-semibold"><Lock className="w-4 h-4" /> Security</TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="grid md:grid-cols-2 gap-6">
                {/* Personal Info */}
                <Card className="rounded-2xl border-border/50 shadow-sm">
                    <CardHeader><CardTitle className="text-lg font-display">Personal Information</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Full Name</Label>
                            <Input value={editName} onChange={e => setEditName(e.target.value)} className="bg-muted/30 border-none" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Email</Label>
                            <Input value={userEmail} disabled className="bg-muted/50 border-none cursor-not-allowed" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Phone Number</Label>
                            <Input value={editPhone} onChange={e => setEditPhone(e.target.value)} className="bg-muted/30 border-none" />
                        </div>
                    </CardContent>
                </Card>

                {/* Address */}
                <Card className="rounded-2xl border-border/50 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-lg font-display">Address</CardTitle>
                        <Button variant="ghost" size="sm" onClick={handleDetectLocation} disabled={detectingLocation} className="text-primary text-xs h-8">
                            {detectingLocation ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <MapPin className="w-3 h-3 mr-1" />}
                            Auto-detect
                        </Button>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Street / House No</Label>
                            <Input value={editAddress.street} onChange={e => updateAddr("street", e.target.value)} className="bg-muted/30 border-none" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">City</Label>
                                <Input value={editAddress.city} onChange={e => updateAddr("city", e.target.value)} className="bg-muted/30 border-none" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">State</Label>
                                <Input value={editAddress.state} onChange={e => updateAddr("state", e.target.value)} className="bg-muted/30 border-none" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Pincode</Label>
                                <Input value={editAddress.pincode} onChange={e => updateAddr("pincode", e.target.value)} maxLength={6} className="bg-muted/30 border-none" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
            <Button onClick={handleSaveProfile} disabled={saving} className="w-full gradient-hero text-primary-foreground border-0 h-12 text-lg font-bold shadow-lg shadow-primary/20">
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : "Save Profile Changes"}
            </Button>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Orders', val: myOrders.length, icon: ShoppingBag, color: 'text-primary bg-primary/10' },
                { label: role === "farmer" ? "Revenue" : "Spent", val: `₹${totalRevenue.toLocaleString()}`, icon: BarChart3, color: 'text-secondary bg-secondary/10' },
                { label: 'Bargains', val: myBargains.length, icon: MessageSquare, color: 'text-warning bg-warning/10' },
                { label: 'Rating', val: avgRating > 0 ? avgRating.toFixed(1) : 'N/A', icon: Star, color: 'text-success bg-success/10' },
              ].map((stat, i) => (
                <Card key={i} className="rounded-2xl border-none shadow-sm overflow-hidden">
                  <CardContent className="pt-6 pb-6 text-center space-y-2">
                    <div className={`w-12 h-12 rounded-2xl ${stat.color} mx-auto flex items-center justify-center`}>
                        <stat.icon className="w-6 h-6" />
                    </div>
                    <p className="text-2xl font-bold text-card-foreground">{stat.val}</p>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{stat.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="rounded-2xl border-border/50">
              <CardHeader><CardTitle className="text-lg font-display">Activity Summary</CardTitle></CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border/50">
                  {[
                    { label: 'Active Orders', val: activeOrders },
                    { label: 'Completed Orders', val: myOrders.filter(o => o.status === "COMPLETED" || o.status === "delivered").length },
                    { label: 'Total Bargains Participated', val: myBargains.length },
                    { label: role === 'farmer' ? 'Crops Listed' : 'Farmers Rated', val: role === 'farmer' ? myCrops.length : receivedRatings.length },
                  ].map((row, i) => (
                    <div key={i} className="flex justify-between items-center px-6 py-4 hover:bg-muted/20 transition-colors">
                        <span className="text-sm font-medium text-muted-foreground">{row.label}</span>
                        <span className="font-bold text-foreground">{row.val}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
        </TabsContent>

        {/* Reviews Tab */}
        <TabsContent value="reviews" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="grid gap-4">
                {receivedRatings.length === 0 ? (
                    <div className="py-20 text-center space-y-3 bg-muted/20 rounded-3xl border-2 border-dashed border-border/50">
                        <Star className="w-12 h-12 mx-auto text-muted-foreground opacity-20" />
                        <p className="text-muted-foreground italic font-medium">You haven't received any ratings yet.</p>
                    </div>
                ) : (
                    receivedRatings.map((r) => (
                        <Card key={r._id} className="rounded-2xl border-border/50 shadow-sm overflow-hidden">
                            <CardContent className="p-5">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                            {(r.buyerName || r.farmerName)?.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold">{r.buyerName || r.farmerName}</p>
                                            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tighter">
                                                {new Date(r.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="bg-secondary/10 px-2 py-1 rounded-lg border border-secondary/20 flex items-center gap-1">
                                        <Star className="w-3 h-3 fill-secondary text-secondary" />
                                        <span className="text-xs font-bold text-secondary-foreground">{r.rating}</span>
                                    </div>
                                </div>
                                {r.review && (
                                    <p className="text-sm text-muted-foreground leading-relaxed italic bg-muted/30 p-3 rounded-xl border border-border/50">
                                        "{r.review}"
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <Card className="rounded-2xl border-border/50 shadow-sm max-w-md">
              <CardHeader><CardTitle className="text-lg font-display">Update Password</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Current Password</Label>
                  <Input type="password" value={oldPw} onChange={e => setOldPw(e.target.value)} placeholder="••••••" className="bg-muted/30 border-none" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">New Password</Label>
                  <Input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="Min. 6 characters" className="bg-muted/30 border-none" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Confirm New Password</Label>
                  <Input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} placeholder="••••••" className="bg-muted/30 border-none" />
                </div>
                <Button onClick={handleChangePassword} className="w-full mt-2 font-bold h-11">Update Security Key</Button>
              </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProfilePage;
