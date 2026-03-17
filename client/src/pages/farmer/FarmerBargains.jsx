import { useAppStore } from "@/stores/AppStore";
import { useAuth } from "@/contexts/AuthContext";
import BargainChat from "@/components/BargainChat";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, ArrowLeft } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";

const FarmerBargains = () => {
  const { userId } = useAuth();
  const { bargains, crops } = useAppStore();
  const myBargains = bargains.filter(b => b.farmerId === userId);
  const [selected, setSelected] = useState(myBargains[0]?.id || null);
  const selectedBargain = myBargains.find(b => b.id === selected);
  const crop = selectedBargain ? crops.find(c => c.id === selectedBargain.cropId) : null;
  const isMobile = useIsMobile();
  const [showChat, setShowChat] = useState(false);

  const [showOrderDialog, setShowOrderDialog] = useState(false);
  const [acceptedBargain, setAcceptedBargain] = useState(null);

  const handleAccepted = (_, price, qty) => {
    if (!selectedBargain) return;
    setAcceptedBargain({ bargainId: selectedBargain.id, price, qty });
    setShowOrderDialog(true);
  };

  const handleSelect = (id) => {
    setSelected(id);
    if (isMobile) setShowChat(true);
  };

  const showList = !isMobile || !showChat;
  const showChatPanel = !isMobile || showChat;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        {isMobile && showChat && (
          <Button variant="ghost" size="icon" onClick={() => setShowChat(false)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
        )}
        <div>
          <h1 className="text-xl md:text-2xl font-display font-bold text-foreground">Bargain Inbox</h1>
          <p className="text-muted-foreground text-sm">Negotiate with buyers ({myBargains.filter(b => b.status === "active").length} active)</p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4 h-[calc(100vh-220px)]">
        {showList && (
          <div className="md:col-span-1 rounded-xl border border-border bg-card overflow-auto">
            {myBargains.map(b => (
              <button
                key={b.id}
                onClick={() => handleSelect(b.id)}
                className={`w-full text-left p-3 md:p-4 border-b border-border hover:bg-muted/50 transition-colors ${selected === b.id ? "bg-accent" : ""}`}
              >
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-sm text-card-foreground">{b.cropName}</p>
                  <Badge variant="outline" className={`text-[10px] ${b.status === "active" ? "border-warning text-warning" : b.status === "accepted" ? "border-success text-success" : "border-destructive text-destructive"}`}>
                    {b.status}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{b.buyerName}</p>
                <p className="text-xs text-muted-foreground">{b.messages.length} messages</p>
              </button>
            ))}
            {myBargains.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8">
                <MessageSquare className="w-8 h-8 mb-2 opacity-30" />
                <p className="text-sm">No bargains yet</p>
              </div>
            )}
          </div>
        )}

        {showChatPanel && (
          <div className="md:col-span-2 rounded-xl border border-border overflow-hidden h-[calc(100vh-220px)]">
            {selectedBargain && crop ? (
              <BargainChat
                bargain={selectedBargain}
                userRole="farmer"
                basePrice={crop.pricePerKg}
                minQuantity={crop.minQuantityKg}
                onAccepted={handleAccepted}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Select a bargain to view
              </div>
            )}
          </div>
        )}
      </div>

      {/* Order created notification */}
      <Dialog open={showOrderDialog} onOpenChange={setShowOrderDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Deal Accepted! 🎉</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              The deal has been accepted. The buyer will now be prompted to pay the 15% advance and provide their delivery address.
            </p>
            {acceptedBargain && (
              <div className="p-3 rounded-lg bg-success/10 border border-success/20">
                <p className="text-sm font-semibold text-card-foreground">
                  ₹{acceptedBargain.price}/kg × {acceptedBargain.qty}kg = ₹{(acceptedBargain.price * acceptedBargain.qty).toLocaleString()}
                </p>
              </div>
            )}
            <Button className="w-full" onClick={() => setShowOrderDialog(false)}>Got it</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FarmerBargains;
