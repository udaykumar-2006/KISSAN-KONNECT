import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Sprout, Eye, EyeOff, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import toast from "react-hot-toast";
import heroImg from "@/assets/hero-farm.jpg";

const LoginPage = () => {
  const { login, role, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && role) {
      navigate(role === "farmer" ? "/farmer" : role === "buyer" ? "/buyer" : "/admin", { replace: true });
    }
  }, [authLoading, role, navigate]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginRole, setLoginRole] = useState("buyer");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) { toast.error("Please fill all fields"); return; }
    setLoading(true);
    const result = await login(email, password, loginRole);
    setLoading(false);
    if (result.success) {
      toast.success("Login successful! Welcome back 🌾");
      navigate(loginRole === "farmer" ? "/farmer" : loginRole === "buyer" ? "/buyer" : "/admin");
    } else {
      toast.error(result.error || "Login failed");
    }
  };

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:block lg:w-1/2 relative">
        <img src={heroImg} alt="Indian farmland" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 gradient-hero opacity-60" />
        <div className="absolute inset-0 flex items-end p-12">
          <div>
            <h2 className="text-4xl font-display font-bold text-primary-foreground mb-2">Kissan Konnect</h2>
            <p className="text-primary-foreground/80 text-lg font-body">Where farmers and buyers meet</p>
          </div>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <div className="flex items-center gap-2 mb-8">
            <Sprout className="w-8 h-8 text-primary" />
            <span className="font-display text-2xl font-bold text-foreground">Login</span>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <Label>Email</Label>
              <Input type="email" placeholder="your@email.com" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div>
              <Label>Password</Label>
              <div className="relative">
                <Input type={showPw ? "text" : "password"} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <Label>Login as</Label>
              <div className="flex gap-2 mt-1">
                {(["farmer", "buyer", "admin"]).map(r => (
                  <button
                    type="button"
                    key={r}
                    onClick={() => setLoginRole(r)}
                    className={`flex-1 py-2.5 rounded-lg border text-sm font-medium capitalize transition-all ${loginRole === r
                        ? "gradient-hero text-primary-foreground border-transparent"
                        : "border-border text-muted-foreground hover:border-primary hover:text-foreground bg-card"
                      }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <Button type="submit" disabled={loading} className="w-full gradient-hero text-primary-foreground border-0 h-11">
              {loading ? (
                <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /> Logging in...</span>
              ) : (
                <span className="flex items-center gap-2"><LogIn className="w-4 h-4" /> Login</span>
              )}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Don't have an account?{" "}
            <Link to="/register" className="text-primary font-medium hover:underline">Register here</Link>
          </p>

          <div className="mt-8 p-4 rounded-lg bg-accent/50 border border-border">
            <p className="text-xs font-semibold text-foreground mb-3">Quick Demo Login:</p>
            <div className="flex gap-2">
              {([
                { label: "🌾 Farmer", email: "rajesh@farm.com", pw: "farmer123", r: "farmer" },
                { label: "🛒 Buyer", email: "priya@buy.com", pw: "buyer123", r: "buyer" },
                { label: "⚙️ Admin", email: "admin@email.com", pw: "admin123", r: "admin" },
              ]).map(demo => (
                <Button
                  key={demo.r}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs"
                  disabled={loading}
                  onClick={() => { setEmail(demo.email); setPassword(demo.pw); setLoginRole(demo.r); }}
                >
                  {demo.label}
                </Button>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground mt-2 text-center">Click a role above to fill credentials, then hit Login</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default LoginPage;
