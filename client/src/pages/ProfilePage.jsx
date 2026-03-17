import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useAppStore } from "@/stores/AppStore";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import  toast  from "react-hot-toast";
import { User, MapPin, Lock, BarChart3, Camera, Loader2, ShoppingBag, Wheat, MessageSquare } from "lucide-react";
import { motion } from "framer-motion";

const ProfilePage = () => {
  const { currentUser, userName, userEmail, userAddress, userPhone, userPhoto, role, userId, updateProfile, changePassword } = useAuth();
  const { orders, crops, bargains } = useAppStore();

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
    await new Promise(r => setTimeout(r, 500));
    updateProfile({ name: editName, phone: editPhone, address: editAddress, photo: photoUrl });
    setSaving(false);
    toast.success("Profile updated! ✅");
  };

  const handleChangePassword = () => {
    if (!oldPw || !newPw) { toast.error("Fill all password fields"); return; }
    if (newPw !== confirmPw) { toast.error("Passwords don't match"); return; }
    const result = changePassword(oldPw, newPw);
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
  const activeOrders = myOrders.filter(o => o.status !== "delivered").length;

  const initials = userName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Profile & Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your account and preferences</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList className="grid grid-cols-3 w-full max-w-sm">
          <TabsTrigger value="profile" className="gap-1.5 text-xs"><User className="w-3.5 h-3.5" /> Profile</TabsTrigger>
          <TabsTrigger value="security" className="gap-1.5 text-xs"><Lock className="w-3.5 h-3.5" /> Security</TabsTrigger>
          <TabsTrigger value="activity" className="gap-1.5 text-xs"><BarChart3 className="w-3.5 h-3.5" /> Activity</TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            {/* Photo */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Avatar className="w-20 h-20 border-2 border-primary/20">
                      <AvatarImage src={photoUrl} />
                      <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">{initials}</AvatarFallback>
                    </Avatar>
                    <label className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center cursor-pointer shadow-md hover:bg-primary/90 transition-colors">
                      <Camera className="w-3.5 h-3.5" />
                    </label>
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-lg text-card-foreground">{userName}</h3>
                    <p className="text-sm text-muted-foreground">{userEmail}</p>
                    <p className="text-xs text-muted-foreground capitalize mt-0.5">
                      {role} · Joined {currentUser?.joinedAt}
                    </p>
                  </div>
                </div>
                <div className="mt-4">
                  <Label className="text-xs">Photo URL</Label>
                  <Input placeholder="https://example.com/photo.jpg" value={photoUrl} onChange={e => setPhotoUrl(e.target.value)} className="mt-1" />
                </div>
              </CardContent>
            </Card>

            {/* Personal Info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-display">Personal Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Full Name</Label>
                    <Input value={editName} onChange={e => setEditName(e.target.value)} className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs">Email <span className="text-muted-foreground">(read-only)</span></Label>
                    <Input value={userEmail} disabled className="mt-1 bg-muted/50" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Phone</Label>
                  <Input value={editPhone} onChange={e => setEditPhone(e.target.value)} placeholder="+91 XXXXX XXXXX" className="mt-1" />
                </div>
              </CardContent>
            </Card>

            {/* Address */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-display">Address</CardTitle>
                  <Button variant="outline" size="sm" onClick={handleDetectLocation} disabled={detectingLocation} className="text-xs h-7 gap-1">
                    {detectingLocation ? <><Loader2 className="w-3 h-3 animate-spin" /> Detecting...</> : <><MapPin className="w-3 h-3" /> Auto-detect</>}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-xs">Street / House No / Area</Label>
                  <Input value={editAddress.street} onChange={e => updateAddr("street", e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs">Landmark</Label>
                  <Input value={editAddress.landmark} onChange={e => updateAddr("landmark", e.target.value)} placeholder="Optional" className="mt-1" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">City</Label>
                    <Input value={editAddress.city} onChange={e => updateAddr("city", e.target.value)} className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs">State</Label>
                    <Input value={editAddress.state} onChange={e => updateAddr("state", e.target.value)} className="mt-1" />
                  </div>
                </div>
                <div className="w-1/2">
                  <Label className="text-xs">Pincode</Label>
                  <Input value={editAddress.pincode} onChange={e => updateAddr("pincode", e.target.value)} maxLength={6} className="mt-1" />
                </div>
              </CardContent>
            </Card>

            <Button onClick={handleSaveProfile} disabled={saving} className="w-full gradient-hero text-primary-foreground border-0 h-11">
              {saving ? <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Saving...</span> : "Save Changes"}
            </Button>
          </motion.div>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-display">Change Password</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-xs">Current Password</Label>
                  <Input type="password" value={oldPw} onChange={e => setOldPw(e.target.value)} placeholder="••••••" className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs">New Password</Label>
                  <Input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="At least 6 characters" className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs">Confirm New Password</Label>
                  <Input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} placeholder="••••••" className="mt-1" />
                </div>
                <Button onClick={handleChangePassword} className="w-full">Update Password</Button>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Card>
                <CardContent className="pt-4 pb-4 text-center">
                  <ShoppingBag className="w-6 h-6 mx-auto mb-1 text-primary" />
                  <p className="text-2xl font-bold text-card-foreground">{myOrders.length}</p>
                  <p className="text-[11px] text-muted-foreground">Total Orders</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-4 text-center">
                  <BarChart3 className="w-6 h-6 mx-auto mb-1 text-secondary" />
                  <p className="text-2xl font-bold text-card-foreground">₹{totalRevenue.toLocaleString()}</p>
                  <p className="text-[11px] text-muted-foreground">{role === "farmer" ? "Revenue" : "Spent"}</p>
                </CardContent>
              </Card>
              {role === "farmer" && (
                <Card>
                  <CardContent className="pt-4 pb-4 text-center">
                    <Wheat className="w-6 h-6 mx-auto mb-1 text-success" />
                    <p className="text-2xl font-bold text-card-foreground">{myCrops.length}</p>
                    <p className="text-[11px] text-muted-foreground">Listed Crops</p>
                  </CardContent>
                </Card>
              )}
              <Card>
                <CardContent className="pt-4 pb-4 text-center">
                  <MessageSquare className="w-6 h-6 mx-auto mb-1 text-warning" />
                  <p className="text-2xl font-bold text-card-foreground">{myBargains.length}</p>
                  <p className="text-[11px] text-muted-foreground">Bargains</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-display">Quick Stats</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between py-2 border-b border-border">
                    <span className="text-muted-foreground">Active Orders</span>
                    <span className="font-semibold text-card-foreground">{activeOrders}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-border">
                    <span className="text-muted-foreground">Completed Orders</span>
                    <span className="font-semibold text-card-foreground">{myOrders.filter(o => o.status === "delivered").length}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-border">
                    <span className="text-muted-foreground">Active Bargains</span>
                    <span className="font-semibold text-card-foreground">{myBargains.filter(b => b.status === "active").length}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-muted-foreground">Member Since</span>
                    <span className="font-semibold text-card-foreground">{currentUser?.joinedAt}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProfilePage;
