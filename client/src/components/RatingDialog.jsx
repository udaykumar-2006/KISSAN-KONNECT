import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import StarRating from './StarRating';
import { Loader2, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import * as api from '@/services/api';

const RatingDialog = ({ isOpen, onClose, order, onRatingComplete, type = 'buyer' }) => {
  const [step, setStep] = useState(1); // 1: Rating, 2: Success
  const [loading, setLoading] = useState(false);
  
  // For 'buyer' type (Buyer rating Crop & Farmer)
  const [cropRating, setCropRating] = useState(0);
  const [cropReview, setCropReview] = useState('');
  const [farmerRating, setFarmerRating] = useState(0);
  const [farmerReview, setFarmerReview] = useState('');

  // For 'farmer' type (Farmer rating Buyer)
  const [buyerRating, setBuyerRating] = useState(0);
  const [buyerReview, setBuyerReview] = useState('');

  const handleSubmit = async () => {
    setLoading(true);
    try {
      if (type === 'buyer') {
        if (cropRating === 0 || farmerRating === 0) {
          toast.error('Please provide ratings for both crop and farmer');
          setLoading(false);
          return;
        }
        
        // Parallel requests for better speed
        await Promise.all([
          api.rateCrop({ orderId: order._id, rating: cropRating, review: cropReview }),
          api.rateFarmer({ orderId: order._id, rating: farmerRating, review: farmerReview })
        ]);
      } else {
        if (buyerRating === 0) {
          toast.error('Please provide a rating');
          setLoading(false);
          return;
        }
        await api.rateBuyer({ orderId: order._id, rating: buyerRating, review: buyerReview });
      }
      
      setStep(2);
      setTimeout(() => {
        onRatingComplete?.();
        onClose();
        // Reset state
        setStep(1);
        setCropRating(0);
        setCropReview('');
        setFarmerRating(0);
        setFarmerReview('');
        setBuyerRating(0);
        setBuyerReview('');
      }, 2000);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit ratings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[450px] overflow-hidden">
        {step === 1 ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl font-display font-bold text-center">
                {type === 'buyer' ? 'Rate Your Experience' : 'Rate the Buyer'}
              </DialogTitle>
              <DialogDescription className="sr-only">Provide feedback for your transaction</DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {type === 'buyer' ? (
                <>
                  {/* Crop Rating */}
                  <div className="space-y-3 p-4 rounded-xl bg-muted/30 border border-border/50">
                    <div className="flex items-center gap-3">
                      <img src={order.cropImage} className="w-10 h-10 rounded-lg object-cover" alt="" />
                      <div>
                        <p className="font-semibold text-sm">{order.cropName}</p>
                        <p className="text-xs text-muted-foreground">How was the quality of the crop?</p>
                      </div>
                    </div>
                    <StarRating rating={cropRating} onRate={setCropRating} size="md" />
                    <Textarea 
                      placeholder="Share your thoughts on the crop quality..." 
                      className="text-xs resize-none h-16 bg-background"
                      value={cropReview}
                      onChange={(e) => setCropReview(e.target.value)}
                    />
                  </div>

                  {/* Farmer Rating */}
                  <div className="space-y-3 p-4 rounded-xl bg-muted/30 border border-border/50">
                    <div>
                      <p className="font-semibold text-sm">Farmer: {order.farmerName}</p>
                      <p className="text-xs text-muted-foreground">How was the farmer's service & communication?</p>
                    </div>
                    <StarRating rating={farmerRating} onRate={setFarmerRating} size="md" />
                    <Textarea 
                      placeholder="Share your experience with the farmer..." 
                      className="text-xs resize-none h-16 bg-background"
                      value={farmerReview}
                      onChange={(e) => setFarmerReview(e.target.value)}
                    />
                  </div>
                </>
              ) : (
                <div className="space-y-3 p-4 rounded-xl bg-muted/30 border border-border/50">
                  <div>
                    <p className="font-semibold text-sm">Buyer: {order.buyerName}</p>
                    <p className="text-xs text-muted-foreground">How was the transaction with this buyer?</p>
                  </div>
                  <StarRating rating={buyerRating} onRate={setBuyerRating} size="md" />
                  <Textarea 
                    placeholder="Write a brief review about the buyer..." 
                    className="text-xs resize-none h-16 bg-background"
                    value={buyerReview}
                    onChange={(e) => setBuyerReview(e.target.value)}
                  />
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={onClose} disabled={loading}>Cancel</Button>
              <Button 
                onClick={handleSubmit} 
                disabled={loading}
                className="gradient-hero text-primary-foreground border-0 min-w-[100px]"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : 'Submit Rating'}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-4 animate-in fade-in zoom-in duration-300">
            <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold">Thank You!</h3>
              <p className="text-sm text-muted-foreground">Your feedback helps the community grow.</p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default RatingDialog;
