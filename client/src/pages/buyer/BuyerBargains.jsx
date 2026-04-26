import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import BargainChat from '@/components/BargainChat';
import { useSearchParams, useNavigate } from 'react-router-dom';
import * as api from '@/services/api';
import toast from 'react-hot-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MessageSquare, Plus, ArrowLeft, Loader2, RefreshCw } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

const BuyerBargains = () => {
  const { userId } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate       = useNavigate();
  const isMobile       = useIsMobile();

  const [bargains,   setBargains]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [selected,   setSelected]   = useState(null);
  const [showChat,   setShowChat]   = useState(false);
  const [initiating, setInitiating] = useState(false);

  const selectedBargain = bargains.find(b => b._id === selected);

  const loadBargains = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.getBargains();
      setBargains(data);
    } catch { toast.error('Failed to load bargains'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadBargains(); }, [loadBargains]);

  // Auto-open from ?crop= param
  useEffect(() => {
    const cropId = searchParams.get('crop');
    if (!cropId || !userId || loading) return;

    const initChat = async () => {
      setInitiating(true);
      try {
        const { data: bargain } = await api.initBargainChat({ cropId });
        setBargains(prev => {
          const exists = prev.find(b => b._id === bargain._id);
          return exists ? prev.map(b => b._id === bargain._id ? bargain : b) : [bargain, ...prev];
        });
        setSelected(bargain._id);
        if (isMobile) setShowChat(true);
        toast.success('Chat ready!');
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to start bargain');
      } finally { setInitiating(false); }
    };
    initChat();
  }, [searchParams, loading, userId]);

  const handleAccepted = useCallback(() => {
    loadBargains();
  }, [loadBargains]);

  const handleSelect = (id) => { setSelected(id); if (isMobile) setShowChat(true); };
  const showList      = !isMobile || !showChat;
  const showChatPanel = !isMobile || showChat;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {isMobile && showChat && <Button variant="ghost" size="icon" onClick={() => setShowChat(false)}><ArrowLeft className="w-5 h-5" /></Button>}
          <div>
            <h1 className="text-xl md:text-2xl font-display font-bold">My Bargains</h1>
            <p className="text-muted-foreground text-sm">{bargains.filter(b=>b.status==='active').length} active</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={loadBargains} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-1 ${loading?'animate-spin':''}`} />Refresh
        </Button>
      </div>

      {initiating && <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20 text-sm text-primary"><Loader2 className="w-4 h-4 animate-spin" />Starting chat…</div>}

      <div className="grid md:grid-cols-3 gap-4 h-[calc(100vh-220px)]">
        {showList && (
          <div className="md:col-span-1 rounded-xl border border-border bg-card overflow-auto">
            {loading ? (
              <div className="flex items-center justify-center h-full text-muted-foreground"><Loader2 className="w-6 h-6 animate-spin mr-2" />Loading…</div>
            ) : bargains.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8">
                <MessageSquare className="w-8 h-8 mb-2 opacity-30" />
                <p className="text-sm">No bargains yet</p>
                <Button size="sm" variant="outline" className="mt-2" onClick={() => navigate('/buyer')}><Plus className="w-3 h-3 mr-1" />Browse Crops</Button>
              </div>
            ) : bargains.map(b => (
              <button key={b._id} onClick={() => handleSelect(b._id)}
                className={`w-full text-left p-3 border-b border-border hover:bg-muted/50 transition-colors ${selected===b._id?'bg-accent':''}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <img src={b.cropImage} alt="" className="w-8 h-8 rounded object-cover shrink-0" />
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">{b.cropName}</p>
                      <p className="text-xs text-muted-foreground truncate">{b.farmerName}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className={`text-[10px] shrink-0 ${b.status==='active'?'border-amber-500 text-amber-500':b.status==='accepted'?'border-green-600 text-green-600':'border-destructive text-destructive'}`}>
                    {b.status}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{b.messages?.length||0} messages</p>
              </button>
            ))}
          </div>
        )}
        {showChatPanel && (
          <div className="md:col-span-2 rounded-xl border border-border overflow-hidden h-[calc(100vh-220px)]">
            {selectedBargain ? (
              <BargainChat bargain={selectedBargain} userRole="buyer" onAccepted={handleAccepted} />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
                <MessageSquare className="w-10 h-10 opacity-30" />
                <p className="text-sm">Select a bargain to start chatting</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default BuyerBargains;
