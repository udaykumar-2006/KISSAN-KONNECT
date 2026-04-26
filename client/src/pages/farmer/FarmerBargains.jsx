import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import BargainChat from '@/components/BargainChat';
import * as api from '@/services/api';
import toast from 'react-hot-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MessageSquare, ArrowLeft, Loader2, RefreshCw } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

const FarmerBargains = () => {
  const { userId } = useAuth();
  const isMobile = useIsMobile();

  const [bargains,  setBargains]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [selected,  setSelected]  = useState(null);
  const [showChat,  setShowChat]  = useState(false);

  // Dialog shown when farmer accepts a deal
  const [showAcceptedDialog, setShowAcceptedDialog] = useState(false);
  const [acceptedInfo,       setAcceptedInfo]       = useState(null);

  const selectedBargain = bargains.find(b => b._id === selected);

  // ── Load bargains ──
  const loadBargains = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.getBargains();
      setBargains(data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load bargains');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadBargains(); }, [loadBargains]);

  // ── Called by BargainChat when deal is accepted ──
  const handleAccepted = useCallback((orderData) => {
    setAcceptedInfo(orderData);
    setShowAcceptedDialog(true);
    loadBargains(); // refresh list to show new status
  }, [loadBargains]);

  const handleSelect = (id) => {
    setSelected(id);
    if (isMobile) setShowChat(true);
  };

  const showList      = !isMobile || !showChat;
  const showChatPanel = !isMobile || showChat;
  const activeCnt     = bargains.filter(b => b.status === 'active').length;

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {isMobile && showChat && (
            <Button variant="ghost" size="icon" onClick={() => setShowChat(false)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}
          <div>
            <h1 className="text-xl md:text-2xl font-display font-bold text-foreground">Bargain Inbox</h1>
            <p className="text-muted-foreground text-sm">
              Negotiate with buyers ({activeCnt} active)
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={loadBargains} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid md:grid-cols-3 gap-4 h-[calc(100vh-220px)]">
        {/* ── Bargain List ── */}
        {showList && (
          <div className="md:col-span-1 rounded-xl border border-border bg-card overflow-auto">
            {loading ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading…
              </div>
            ) : bargains.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8">
                <MessageSquare className="w-8 h-8 mb-2 opacity-30" />
                <p className="text-sm">No bargain requests yet</p>
              </div>
            ) : bargains.map(b => (
              <button
                key={b._id}
                onClick={() => handleSelect(b._id)}
                className={`w-full text-left p-3 md:p-4 border-b border-border hover:bg-muted/50 transition-colors ${selected === b._id ? 'bg-accent' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <img src={b.cropImage} alt="" className="w-8 h-8 rounded object-cover shrink-0" />
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-card-foreground truncate">{b.cropName}</p>
                      <p className="text-xs text-muted-foreground truncate">{b.buyerName}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className={`text-[10px] shrink-0 ${
                    b.status === 'active'   ? 'border-amber-500 text-amber-500' :
                    b.status === 'accepted' ? 'border-green-600 text-green-600' :
                                             'border-destructive text-destructive'
                  }`}>
                    {b.status}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{b.messages?.length || 0} messages</p>
              </button>
            ))}
          </div>
        )}

        {/* ── Chat Panel ── */}
        {showChatPanel && (
          <div className="md:col-span-2 rounded-xl border border-border overflow-hidden h-[calc(100vh-220px)]">
            {selectedBargain ? (
              <BargainChat
                bargain={selectedBargain}
                userRole="farmer"
                onAccepted={handleAccepted}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
                <MessageSquare className="w-10 h-10 opacity-30" />
                <p className="text-sm">Select a bargain request to respond</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Deal Accepted Dialog ── */}
      <Dialog open={showAcceptedDialog} onOpenChange={setShowAcceptedDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Deal Accepted! 🎉</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              The deal has been accepted and an order has been automatically created.
              The buyer will be prompted to pay the 15% advance to confirm the order.
            </p>

            {acceptedInfo && (
              <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 space-y-1">
                {acceptedInfo.totalPrice && (
                  <p className="text-sm font-semibold text-card-foreground">
                    Order Total: ₹{acceptedInfo.totalPrice.toLocaleString()}
                  </p>
                )}
                {acceptedInfo.advanceAmount && (
                  <p className="text-sm text-muted-foreground">
                    Advance (15%): ₹{acceptedInfo.advanceAmount.toLocaleString()}
                  </p>
                )}
                {acceptedInfo.remainingAmount && (
                  <p className="text-sm text-muted-foreground">
                    On Delivery (85%): ₹{acceptedInfo.remainingAmount.toLocaleString()}
                  </p>
                )}
              </div>
            )}

            <div className="p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground space-y-1">
              <p>📦 Once buyer pays advance → <strong>Order Confirmed</strong></p>
              <p>🚜 You can then update order status from your Orders page</p>
            </div>

            <Button className="w-full" onClick={() => setShowAcceptedDialog(false)}>
              Got it
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FarmerBargains;
